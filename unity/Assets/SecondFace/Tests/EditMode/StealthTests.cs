using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.3: light on the body, what shows, how far seen and heard, awareness rising and fading.</summary>
    public class StealthTests
    {
        // the sky's key light and ambient luminance at noon and at night (Sky's keys)
        private const double Noon = 2.5, NoonAmbient = 0.42, Night = 0.32, NightAmbient = 0.07;

        [Test]
        public void LightOnTheBody()
        {
            var noonOpen = Stealth.Light(Noon, false, NoonAmbient, 0);
            var noonIndoors = Stealth.Light(Noon, true, NoonAmbient, 0);
            var nightOpen = Stealth.Light(Night, false, NightAmbient, 0);
            var nightLamp = Stealth.Light(Night, false, NightAmbient, Stealth.Lamp(2.5, 7, 1));
            Assert.That(noonOpen, Is.GreaterThan(0.8), "the noon sun");
            Assert.That(noonIndoors, Is.LessThan(0.3), "under a roof at noon");
            Assert.That(nightOpen, Is.LessThan(0.2), "the moon");
            Assert.That(nightLamp, Is.GreaterThan(0.45), "a metre from a lamp at night");
            Assert.That(Stealth.Lamp(2.5, 7, 7.5), Is.EqualTo(0), "past its range");
            Assert.That(Stealth.Lamp(2.5, 7, 4), Is.LessThan(Stealth.Lamp(2.5, 7, 2)));
            Assert.That(Stealth.Light(Noon, false, 1, 1), Is.EqualTo(1), "never more than full");
        }

        [Test]
        public void WhatShowsAndHowFar()
        {
            Assert.That(Stealth.Exposure(1, true, 0, 0.8), Is.LessThan(Stealth.Exposure(1, false, 0, 1.4)), "a crouch hides");
            Assert.That(Stealth.Exposure(1, true, 80, 0.8), Is.LessThan(Stealth.Exposure(1, true, 10, 0.8)), "practice hides more");
            Assert.That(Stealth.Exposure(1, false, 0, 3.2), Is.GreaterThan(Stealth.Exposure(1, false, 0, 1.4)), "a run shows more");
            Assert.That(Stealth.SightRange(0, 4), Is.EqualTo(2.5), "a couple of metres even in the dark");
            Assert.That(Stealth.SightRange(0.9, 4), Is.InRange(18, 25), "far in the sun");
            Assert.That(Stealth.SightRange(0.9, 9), Is.GreaterThan(Stealth.SightRange(0.9, 3)), "sharp senses see further");
            Assert.That(Stealth.Noise(0, false, 0), Is.EqualTo(0), "still: silent");
            Assert.That(Stealth.Noise(0.8, true, 0), Is.LessThan(2), "a sneak barely");
            Assert.That(Stealth.Noise(0.8, true, 80), Is.LessThan(Stealth.Noise(0.8, true, 0)));
            Assert.That(Stealth.Noise(3.2, false, 0), Is.GreaterThan(Stealth.Noise(1.4, false, 0)), "a run is heard further");
        }

        [Test]
        public void AwarenessRisesAndFades()
        {
            double Watch(double seconds, double d, double angle, bool los, double exposure, double noise, double a = 0)
            {
                for (var t = 0.0; t < seconds; t += 0.2) a = Stealth.Step(a, 0.2, d, angle, los, exposure, 4, noise);
                return a;
            }
            var day = Stealth.Exposure(Stealth.Light(Noon, false, NoonAmbient, 0), false, 10, 1.4);
            var nightSneak = Stealth.Exposure(Stealth.Light(Night, false, NightAmbient, 0), true, 30, 0.85);
            Assert.That(Watch(2, 8, 10, true, day, 4.5), Is.GreaterThanOrEqualTo(Stealth.Noticed), "walking in front of someone by day");
            Assert.That(Watch(10, 8, 170, true, nightSneak, Stealth.Noise(0.85, true, 30)), Is.EqualTo(0), "sneaking behind them at night");
            Assert.That(Watch(10, 8, 10, true, nightSneak, 0), Is.EqualTo(0), "in front of them at night, eight metres off: unseen");
            Assert.That(Watch(3, 2, 10, true, nightSneak, 0), Is.GreaterThanOrEqualTo(Stealth.Noticed), "two metres in front: seen");
            Assert.That(Watch(10, 8, 10, false, day, 0), Is.EqualTo(0), "a wall between");
            Assert.That(Watch(3, 3, 170, false, day, 10), Is.GreaterThanOrEqualTo(Stealth.Noticed), "running past behind a wall is heard");
            var half = Watch(1, 10, 70, true, day, 0);
            var full = Watch(1, 10, 10, true, day, 0);
            Assert.That(half, Is.LessThan(full), "the edge of the eye sees slower");
            Assert.That(Watch(20, 30, 10, true, 0, 0, 1.0), Is.LessThan(Stealth.Suspicious), "out of sight it fades");
        }
    }
}
