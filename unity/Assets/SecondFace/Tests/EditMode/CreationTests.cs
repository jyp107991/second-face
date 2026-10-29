using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Npc;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>P5.3i: character creation's rules (origins, the rolled start, points, tags, traits, the look).</summary>
    public class CreationTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void AnOriginGivesItsAttributesTagsTraitsAndAFace()
        {
            var c = Creation.Start();
            var first = Creation.Origins()[0];
            Assert.That(c.Origin, Is.EqualTo(first.Id));
            foreach (var a in Rules.Attributes) Assert.That(c.Sheet.BaseAttrs[a], Is.EqualTo(first.Attrs[a]));
            Assert.That(c.Sheet.Tagged, Is.EquivalentTo(first.Tagged));
            Assert.That(c.Sheet.Traits, Is.EquivalentTo(first.Traits));
            Assert.That(c.PointsLeft, Is.EqualTo(0), "an origin spends the standard 12");
            Assert.That(c.Look.Face.Count, Is.EqualTo(Sculpt.Sliders.Count(x => x.Paired) + 1), "a face to start from: every paired slider and one head shape");
            var face = c.Look.Face;
            var other = Creation.Origins()[1];
            c.Choose(other.Id);
            Assert.That(Sculpt.Distance(face, c.Look.Face), Is.GreaterThan(0.5f), "each origin has its own face");
            c.Choose(first.Id, newLook: false);
            Assert.That(c.Sheet.Tagged, Is.EquivalentTo(first.Tagged));
        }

        [Test]
        public void RollKeepRecallAndMovePointsWithinThePool()
        {
            var c = Creation.Start();
            var rng = new Rng(5);
            c.Roll(rng);
            Assert.That(c.Rolled, Is.True);
            Assert.That(c.PointsLeft, Is.EqualTo(0), "a roll is spent as rolled");
            var pool = c.Pool;
            c.Keep();
            var kept = Rules.Attributes.ToDictionary(a => a, a => c.Sheet.BaseAttrs[a]);
            for (var i = 0; i < 5; i++) c.Roll(rng);
            Assert.That(c.Recall(), Is.True);
            Assert.That(c.Pool, Is.EqualTo(pool));
            foreach (var a in Rules.Attributes) Assert.That(c.Sheet.BaseAttrs[a], Is.EqualTo(kept[a]));
            // move a point: lower one, raise another; the total stays the pool's
            var from = Rules.Attributes.First(a => c.Sheet.BaseAttrs[a] > Rules.AttrMin);
            var to = Rules.Attributes.First(a => a != from && c.Sheet.BaseAttrs[a] < Rules.AttrCreationMax);
            Assert.That(c.Raise(to), Is.False, "nothing left to spend");
            Assert.That(c.Lower(from), Is.True);
            Assert.That(c.PointsLeft, Is.EqualTo(1));
            Assert.That(c.Raise(to), Is.True);
            Assert.That(c.PointsLeft, Is.EqualTo(0));
            Assert.That(c.Origin, Is.Null, "changed by hand: no longer the origin's");
            c.Standard();
            Assert.That(c.Rolled, Is.False);
            Assert.That(c.PointsLeft, Is.EqualTo(0));
            // bounds
            var s = c.Sheet;
            var a1 = Rules.Attributes[0];
            while (c.Lower(a1)) { }
            Assert.That(s.BaseAttrs[a1], Is.EqualTo(Rules.AttrMin));
            while (c.Raise(Rules.Attributes[1])) { }
            Assert.That(s.BaseAttrs[Rules.Attributes[1]], Is.LessThanOrEqualTo(Rules.AttrCreationMax));
        }

        [Test]
        public void TagsTraitsNameAndFinish()
        {
            var c = Creation.Start();
            Assert.That(c.Missing(), Is.EquivalentTo(new[] { "name" }));
            Assert.That(c.Finish(), Is.Null);
            var extra = Rules.Skills.First(k => !c.Sheet.Tagged.Contains(k));
            Assert.That(c.Tag(extra), Is.False, "three already");
            Assert.That(c.Tag(c.Sheet.Tagged[0]), Is.True, "untagged");
            Assert.That(c.Missing(), Does.Contain("tags"));
            Assert.That(c.Tag(extra), Is.True);
            var traits = Core.Content.Registry.Traits.Keys.Where(t => !c.Sheet.Traits.Contains(t)).ToList();
            while (c.Sheet.Traits.Count < Creation.MaxTraits) c.Trait(traits[c.Sheet.Traits.Count]);
            Assert.That(c.Trait(traits.Last()), Is.False, "two at most");
            c.Sheet.Name = "  Ash Corran ";
            c.Pronouns = "she";
            c.Look.Body = "m";
            c.Look.Scar = Looks.Scars[2];
            c.Look.Dyes["top"] = Looks.Dyes[3];
            Assert.That(c.Ready, Is.True);
            var pc = c.Finish();
            Assert.That(pc, Is.Not.Null);
            Assert.That(pc.Sheet.Name, Is.EqualTo("Ash Corran"));
            Assert.That(pc.Sheet.Hp, Is.EqualTo(Sheet.Derived(pc.Sheet).MaxHp));
            Assert.That(pc.Pronouns, Is.EqualTo("she"));
            var look = PlayerLook.From(pc.Appearance);
            Assert.That(look.Body, Is.EqualTo("m"));
            Assert.That(look.Scar, Is.EqualTo(Looks.Scars[2]));
            Assert.That(look.Dyes["top"], Is.EqualTo(Looks.Dyes[3]));
            Assert.That(Sculpt.Distance(look.Face, c.Look.Face), Is.EqualTo(0f).Within(1e-6), "the face survives the save");
            Assert.That(PlayerLook.From(new Newtonsoft.Json.Linq.JObject { ["shape"] = 1 }).Body, Is.EqualTo("f"), "an old look reads as the default");
        }
    }
}
