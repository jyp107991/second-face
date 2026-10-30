using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The face sculptor's sliders as blend-shape weights (§6.B.5); faces themselves come from archetypes (FacesTests).</summary>
    public class SculptTests
    {
        [Test]
        public void ASliderDrivesOneShapeOfItsPair()
        {
            var w = Sculpt.Weights(new Dictionary<string, float> { ["nose-hump"] = 0.6f, ["chin-width"] = -0.25f, ["head-round"] = 0.5f }).ToDictionary(x => x.Shape, x => x.Weight);
            Assert.That(w["nose-hump-incr"], Is.EqualTo(60f).Within(1e-4));
            Assert.That(w["nose-hump-decr"], Is.EqualTo(0f));
            Assert.That(w["chin-width-decr"], Is.EqualTo(25f).Within(1e-4));
            Assert.That(w["chin-width-incr"], Is.EqualTo(0f));
            Assert.That(w["head-round"], Is.EqualTo(50f).Within(1e-4));
            Assert.That(w["eye-trans-in"], Is.EqualTo(0f), "an untouched slider sets both shapes to zero");
            Assert.That(w[Sculpt.Aged], Is.EqualTo(0f));
        }

        [Test]
        public void EveryShapeIsListedOnceAndValuesAreClamped()
        {
            var shapes = Sculpt.Shapes().ToList();
            Assert.That(shapes.Distinct().Count(), Is.EqualTo(shapes.Count));
            var w = Sculpt.Weights(new Dictionary<string, float> { ["eye-scale"] = 3f, ["nose-scale-horiz"] = 3f, ["head-oval"] = -1f, ["not-a-slider"] = 1f }, aged: 2f);
            Assert.That(w.Select(x => x.Shape), Is.EqualTo(shapes), "the weights cover exactly the sculptor's shapes, in order");
            var d = w.ToDictionary(x => x.Shape, x => x.Weight);
            Assert.That(d["nose-scale-horiz-incr"], Is.EqualTo(100f));
            // a slider the real faces take past the shape's end (Sculpt.Extended, R3) is clamped to its own reach
            Assert.That(Sculpt.Reach("eye-scale"), Is.GreaterThan(1f));
            Assert.That(d["eye-scale-incr"], Is.EqualTo(100f * Sculpt.Reach("eye-scale")).Within(1e-3f));
            Assert.That(d["head-oval"], Is.EqualTo(0f), "single shapes do not go below zero");
            Assert.That(d[Sculpt.Aged], Is.EqualTo(100f));
            Assert.That(Sculpt.Sliders.All(s => Sculpt.Groups.Contains(s.Group)), Is.True);
        }
    }
}
