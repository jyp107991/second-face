using System.Collections.Generic;
using NUnit.Framework;
using SecondFace.Core.Input;

namespace SecondFace.Tests
{
    /// <summary>The touch gestures (§6.F.2) frame by frame: drag, tap, double tap, long press, pinch and pan.</summary>
    public class GesturesTests
    {
        private static List<Finger> F(params (int id, float x, float y)[] f)
        {
            var l = new List<Finger>();
            foreach (var (id, x, y) in f) l.Add(new Finger(id, x, y));
            return l;
        }

        private static readonly List<Finger> None = new();

        [Test]
        public void AQuickStillTouchTaps()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 100, 100)));
            g.Update(0.05f, F((1, 103, 101)));
            Assert.That(g.Tap, Is.Null);
            g.Update(0.1f, None);
            Assert.That(g.Tap, Is.Not.Null);
            Assert.That(g.Tap.Value.x, Is.EqualTo(103f));
            g.Update(0.15f, None);
            Assert.That(g.Tap, Is.Null, "a tap is reported once");
        }

        [Test]
        public void ATouchThatMovesDragsAndNeverTaps()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 100, 100)));
            g.Update(0.02f, F((1, 108, 100)));
            Assert.That(g.Dragging, Is.False, "within the slop");
            g.Update(0.04f, F((1, 130, 90)));
            Assert.That(g.Dragging, Is.True);
            Assert.That(g.DragX, Is.EqualTo(22f));
            Assert.That(g.DragY, Is.EqualTo(-10f));
            g.Update(0.06f, None);
            Assert.That(g.Tap, Is.Null);
        }

        [Test]
        public void TwoQuickTapsNearEachOtherAreADoubleTap()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 100, 100))); g.Update(0.08f, None);
            Assert.That(g.Tap, Is.Not.Null);
            g.Update(0.2f, F((2, 110, 105))); g.Update(0.28f, None);
            Assert.That(g.DoubleTap, Is.Not.Null);
            Assert.That(g.Tap, Is.Null);
        }

        [Test]
        public void TapsFarApartOrSlowAreTwoTaps()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 100, 100))); g.Update(0.08f, None);
            g.Update(0.2f, F((2, 300, 100))); g.Update(0.28f, None);
            Assert.That(g.Tap, Is.Not.Null, "far apart");
            Assert.That(g.DoubleTap, Is.Null);
            g.Update(1.0f, F((3, 300, 100))); g.Update(1.08f, None);
            Assert.That(g.Tap, Is.Not.Null, "too late for a double tap");
        }

        [Test]
        public void AHeldStillTouchLongPressesOnceAndDoesNotTap()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 50, 50)));
            g.Update(0.3f, F((1, 51, 50)));
            Assert.That(g.LongPress, Is.Null);
            g.Update(0.5f, F((1, 51, 50)));
            Assert.That(g.LongPress, Is.Not.Null);
            g.Update(0.6f, F((1, 51, 50)));
            Assert.That(g.LongPress, Is.Null, "once");
            g.Update(0.7f, None);
            Assert.That(g.Tap, Is.Null);
        }

        [Test]
        public void TwoFingersPinchAndPanAndNeverTap()
        {
            var g = new Gestures();
            g.Update(0f, F((1, 100, 100)));
            g.Update(0.02f, F((1, 100, 100), (2, 200, 100)));
            Assert.That(g.Pinch, Is.EqualTo(1f));
            g.Update(0.04f, F((1, 90, 110), (2, 210, 110)));
            Assert.That(g.Pinch, Is.EqualTo(1.2f).Within(1e-4f), "spread 100 → 120");
            Assert.That(g.PanY, Is.EqualTo(10f));
            Assert.That(g.PanX, Is.EqualTo(0f));
            g.Update(0.06f, F((1, 90, 110)));
            g.Update(0.08f, None);
            Assert.That(g.Tap, Is.Null);
        }
    }
}
