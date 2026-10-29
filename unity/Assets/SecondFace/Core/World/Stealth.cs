using System;

namespace SecondFace.Core.World
{
    /// <summary>
    /// What the people about make of the player (P6.3, DESIGN_UNITY §5.1): how lit the player's body is (the sun or the
    /// moon unless they are under a roof, the sky's own light, the lamps near), how much of them shows (less in a crouch
    /// and to a practised sneak, more at a run), how far they are seen at that (a few metres even in the dark, far in the
    /// sun, further for sharp senses) and heard (nothing standing, little in a sneak, more walking, far running), and
    /// how an observer's awareness rises while they see or hear the player (faster close and at the middle of the eye,
    /// half as fast at its edge, not at all behind them or through a wall) and fades when they do neither. Awareness
    /// past <see cref="Suspicious"/> turns a head; at <see cref="Noticed"/> the player has been seen.
    /// </summary>
    public static class Stealth
    {
        public const double Suspicious = 0.35, Noticed = 1.0, Max = 1.2;
        /// <summary>Awareness lost a second when the player is neither seen nor heard.</summary>
        public const double Decay = 0.12;
        /// <summary>Degrees either side of where someone faces that they see at the full rate; to <see cref="Edge"/>
        /// at half (the edge of the eye); behind that, nothing.</summary>
        public const double Cone = 55, Edge = 85;
        /// <summary>The key light (sun or moon) of a noon sky, the brightest there is (Sky's keys).</summary>
        public const double NoonLight = 2.5;
        /// <summary>How fast one goes in a sneak, m/s (the captured crouched walk's own pace).</summary>
        public const float SneakSpeed = 0.85f;

        /// <summary>How lit a body is, 0 (dark) to 1 (the noon sun): the key light of the sky (<paramref name="key"/>, its
        /// intensity) unless <paramref name="shaded"/> (under a roof), the sky's ambient light (its luminance, linear) and
        /// the lamps near (each <see cref="Lamp"/>).</summary>
        public static double Light(double key, bool shaded, double ambient, double lamps) =>
            Clamp01(0.75 * (shaded ? 0 : Math.Min(1, key / NoonLight)) + 0.4 * ambient + lamps);

        /// <summary>A lamp's light on a body <paramref name="distance"/> m off: its intensity, falling to nothing at its
        /// range (a lamp of 2.5 lights a body a metre off about as the evening sun does).</summary>
        public static double Lamp(double intensity, double range, double distance)
        {
            if (range <= 0 || distance >= range) return 0;
            var f = 1 - Math.Max(0, distance) / range;
            return 0.8 * intensity / NoonLight * f * f;
        }

        /// <summary>How much of the player shows at a light: a crouch hides almost half, a practised sneak more (a stealth
        /// of 100 shows 0.6 of what an untrained one does), a run shows more.</summary>
        public static double Exposure(double light, bool sneaking, int stealth, double speed) =>
            light * (sneaking ? 0.55 : 1) * (1 - Math.Clamp(stealth, 0, 100) / 250.0) * (speed > 2.5 ? 1.25 : 1);

        /// <summary>How far someone with <paramref name="senses"/> sees the player at an exposure, metres: a couple even
        /// in the dark, some 25 m in the sun.</summary>
        public static double SightRange(double exposure, int senses) => 2.5 + Math.Max(0, exposure) * (16 + 1.5 * senses);

        /// <summary>How far the player is heard, metres: nothing standing still, a metre or two in a sneak (less for the
        /// practised), a few walking, far running; <paramref name="surface"/> makes hard ground louder.</summary>
        public static double Noise(double speed, bool sneaking, int stealth, double surface = 1)
        {
            if (speed < 0.1) return 0;
            var r = sneaking ? 1.6 * (1 - Math.Clamp(stealth, 0, 100) / 200.0) : speed < 2 ? 4.5 : 10;
            return r * surface;
        }

        /// <summary>An observer's awareness after <paramref name="dt"/> s: rising while they see the player (in sight
        /// range, in the eye, nothing between) faster the nearer, and while they hear them; else fading.</summary>
        /// <param name="angle">Degrees between where the observer faces and the player.</param>
        public static double Step(double awareness, double dt, double distance, double angle, bool lineOfSight, double exposure, int senses, double noise)
        {
            var gain = 0.0;
            var range = SightRange(exposure, senses);
            if (lineOfSight && distance < range && angle <= Edge)
            {
                var eye = angle <= Cone ? 1.0 : 0.5;
                gain += eye * (0.25 + 1.75 * (1 - distance / range));   // a second: seen in ~0.6 s close, ~4 s at the edge
            }
            if (noise > 0 && distance < noise) gain += 0.6 * (1 - distance / noise);
            if (gain <= 0) return Math.Max(0, awareness - Decay * dt);
            return Math.Min(Max, awareness + gain * dt);
        }

        private static double Clamp01(double v) => v < 0 ? 0 : v > 1 ? 1 : v;
    }
}
