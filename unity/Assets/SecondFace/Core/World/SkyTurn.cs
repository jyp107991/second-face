using System;

namespace SecondFace.Core.World
{
    /// <summary>
    /// How the light answers a change that is not the clock running (pure; Game <c>SkyController</c> applies it):
    /// <list type="bullet">
    /// <item>a jump of the clock (a conversation's "until dusk", a night slept, a move's minutes) turns the light over a
    /// second or two instead of cutting to it (<see cref="Seconds"/>, <see cref="Blend"/>), while the page stays open;</item>
    /// <item>a still composed at a named light (the epilogue's dawn, day, dusk and night) is lit at a fixed hour
    /// (<see cref="HourOf"/>);</item>
    /// <item>smoke over a burning skyline browns and dims the light, thickens the air and hides the stars
    /// (<see cref="Smoke"/>; 0 leaves the look as it was).</item>
    /// </list>
    /// </summary>
    public static class SkyTurn
    {
        /// <summary>How long the light takes to turn after the clock jumped from one time to another (real seconds; 0: no
        /// jump worth turning for, under a minute of game time).</summary>
        public static float Seconds(double fromMinutes, double toMinutes)
        {
            var d = Math.Abs(toMinutes - fromMinutes);
            if (d < 1.0) return 0f;
            // an hour's jump turns in about a second; a night or more in two
            return (float)Math.Min(2.0, 0.9 + Math.Min(d, 720.0) / 720.0 * 1.1);
        }

        /// <summary>The look part way through a turn from one look to another (<paramref name="t"/> 0..1, eased in and
        /// out): every colour and amount between the two, the sun's and the light's directions turned between them.</summary>
        public static SkyLook Blend(SkyLook from, SkyLook to, float t)
        {
            if (from == null) return to;
            if (to == null) return from;
            t = Math.Clamp(t, 0f, 1f);
            t = t * t * (3 - 2 * t);
            var look = SkyLook.Lerp(from, to, t);
            float sx = from.SunX + (to.SunX - from.SunX) * t, sy = from.SunY + (to.SunY - from.SunY) * t, sz = from.SunZ + (to.SunZ - from.SunZ) * t;
            var n = (float)Math.Sqrt(sx * sx + sy * sy + sz * sz);
            if (n < 1e-4f) { sx = to.SunX; sy = to.SunY; sz = to.SunZ; n = 1f; }
            look.SunX = sx / n; look.SunY = sy / n; look.SunZ = sz / n;
            return look;
        }

        /// <summary>The hour a named light is shown at (the epilogue's stills): dawn just after sunrise, day early in the
        /// afternoon, dusk at sunset, night well after dark. Null for an unknown name (the clock's own hour stands).</summary>
        public static double? HourOf(string light) => light switch
        {
            "dawn" => 6.0,
            "day" => 13.0,
            "dusk" => 18.6,
            "night" => 23.0,
            _ => (double?)null,
        };

        /// <summary>A weather by the content's name (null when it names none the sky knows).</summary>
        public static WeatherKind? WeatherOf(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;
            foreach (WeatherKind w in Enum.GetValues(typeof(WeatherKind)))
                if (string.Equals(w.ToString(), name, StringComparison.OrdinalIgnoreCase)) return w;
            return null;
        }

        private static readonly Rgb SmokeColour = Sky.Linear(new Rgb(0x6a / 255f, 0x4a / 255f, 0x32 / 255f));
        private static readonly Rgb Glow = Sky.Linear(new Rgb(0xff / 255f, 0x8a / 255f, 0x40 / 255f));

        /// <summary>The look under smoke from fires on the skyline (<paramref name="amount"/> 0..1): the sun dimmed and
        /// browned, the sky and the fog toward the smoke's brown (lit from below by the fires at the horizon), the air
        /// thicker, the clouds heavy, no stars. A new look; the one given is not changed.</summary>
        public static SkyLook Smoke(SkyLook look, float amount)
        {
            if (look == null) return null;
            var a = Math.Clamp(amount, 0f, 1f);
            var s = SkyLook.Lerp(look, look, 0f);   // a copy
            s.SunX = look.SunX; s.SunY = look.SunY; s.SunZ = look.SunZ;
            if (a <= 0f) return s;
            Rgb Toward(Rgb c, Rgb tint, float k) => Rgb.Lerp(c, tint * Math.Max(0.2f, c.Luma / Math.Max(tint.Luma, 1e-4f)), k);
            s.LightIntensity = look.LightIntensity * (1f - 0.45f * a);
            s.LightColour = Toward(look.LightColour, Glow, 0.55f * a);
            s.ShadowStrength = look.ShadowStrength * (1f - 0.35f * a);
            s.Zenith = Toward(look.Zenith, SmokeColour, 0.7f * a) * (1f - 0.25f * a);
            s.Horizon = Rgb.Lerp(Toward(look.Horizon, SmokeColour, 0.6f * a), Glow * Math.Max(0.25f, look.Horizon.Luma), 0.35f * a);
            s.Fog = Toward(look.Fog, SmokeColour, 0.75f * a);
            s.FogDensity = look.FogDensity * (1f + 2.5f * a);
            s.AmbientSky = Toward(look.AmbientSky, SmokeColour, 0.5f * a);
            s.AmbientEquator = Toward(look.AmbientEquator, Glow, 0.3f * a);
            s.Clouds = Math.Max(look.Clouds, 0.85f * a);
            s.CloudColour = Toward(look.CloudColour, SmokeColour, 0.8f * a) * (1f - 0.3f * a);
            s.Stars = look.Stars * (1f - a);
            s.Moon = look.Moon * (1f - 0.8f * a);
            s.Dust = Math.Max(look.Dust, 1.2f * a);
            return s;
        }
    }
}
