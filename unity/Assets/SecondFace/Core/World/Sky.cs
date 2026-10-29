using System;

namespace SecondFace.Core.World
{
    /// <summary>A linear colour (no engine types in Core).</summary>
    public readonly struct Rgb
    {
        public readonly float R, G, B;
        public Rgb(float r, float g, float b) { R = r; G = g; B = b; }
        public static Rgb Lerp(Rgb a, Rgb b, float t) => new(a.R + (b.R - a.R) * t, a.G + (b.G - a.G) * t, a.B + (b.B - a.B) * t);
        public static Rgb operator *(Rgb a, float k) => new(a.R * k, a.G * k, a.B * k);
        public static Rgb operator *(Rgb a, Rgb b) => new(a.R * b.R, a.G * b.G, a.B * b.B);
        public static Rgb operator +(Rgb a, Rgb b) => new(a.R + b.R, a.G + b.G, a.B + b.B);
        public float Luma => 0.2126f * R + 0.7152f * G + 0.0722f * B;
        /// <summary>Pulled towards its own grey by <paramref name="t"/> (0 unchanged, 1 grey).</summary>
        public Rgb Grey(float t) => Lerp(this, new Rgb(Luma, Luma, Luma), t);
        public float MaxDiff(Rgb o) => Math.Max(Math.Abs(R - o.R), Math.Max(Math.Abs(G - o.G), Math.Abs(B - o.B)));
        public override string ToString() => $"({R:0.00}, {G:0.00}, {B:0.00})";
    }

    /// <summary>
    /// What the sky and the light look like at an hour in a weather (BUILD_PLAN §6.A.6): the sun's path for one latitude
    /// and one season (the game keeps days, not a calendar), the light's colours keyed on the sun's height, and the
    /// weather's changes on top. Every field lerps, so the game blends two looks across a region border or a change of
    /// weather. Pure: the tests read the same numbers the game shows. The palette is lit, not dusty (UPGRADE: clear sun
    /// with hard shadows is common; gloom is a choice, never the default), and the night is blue and readable.
    /// </summary>
    public sealed class SkyLook
    {
        /// <summary>The direction light comes FROM (unit, y up): the sun by day, the moon by night.</summary>
        public float LightX, LightY, LightZ;
        public Rgb LightColour;
        public float LightIntensity, ShadowStrength;
        /// <summary>The sun's own direction (for the disc in the sky; below the horizon at night).</summary>
        public float SunX, SunY, SunZ;
        public Rgb Zenith, Horizon, Ground, SunGlow;
        public Rgb AmbientSky, AmbientEquator, AmbientGround;
        public Rgb Fog;
        /// <summary>Exponential-squared fog density, per metre.</summary>
        public float FogDensity;
        /// <summary>0..1: cloud cover on the dome, the stars' and the moon's visibility.</summary>
        public float Clouds, Stars, Moon;
        public Rgb CloudColour;
        /// <summary>Particle layers, 0..~3: dust motes and blown dust, rain, snow.</summary>
        public float Dust, Rain, Snow;

        public static SkyLook Lerp(SkyLook a, SkyLook b, float t)
        {
            float L(float x, float y) => x + (y - x) * t;
            Rgb C(Rgb x, Rgb y) => Rgb.Lerp(x, y, t);
            var lx = L(a.LightX, b.LightX); var ly = L(a.LightY, b.LightY); var lz = L(a.LightZ, b.LightZ);
            var n = (float)Math.Sqrt(lx * lx + ly * ly + lz * lz);
            if (n < 1e-4f) { lx = a.LightX; ly = a.LightY; lz = a.LightZ; n = 1; }
            return new SkyLook
            {
                LightX = lx / n, LightY = ly / n, LightZ = lz / n,
                LightColour = C(a.LightColour, b.LightColour), LightIntensity = L(a.LightIntensity, b.LightIntensity), ShadowStrength = L(a.ShadowStrength, b.ShadowStrength),
                SunX = a.SunX, SunY = a.SunY, SunZ = a.SunZ,
                Zenith = C(a.Zenith, b.Zenith), Horizon = C(a.Horizon, b.Horizon), Ground = C(a.Ground, b.Ground), SunGlow = C(a.SunGlow, b.SunGlow),
                AmbientSky = C(a.AmbientSky, b.AmbientSky), AmbientEquator = C(a.AmbientEquator, b.AmbientEquator), AmbientGround = C(a.AmbientGround, b.AmbientGround),
                Fog = C(a.Fog, b.Fog), FogDensity = L(a.FogDensity, b.FogDensity),
                Clouds = L(a.Clouds, b.Clouds), Stars = L(a.Stars, b.Stars), Moon = L(a.Moon, b.Moon), CloudColour = C(a.CloudColour, b.CloudColour),
                Dust = L(a.Dust, b.Dust), Rain = L(a.Rain, b.Rain), Snow = L(a.Snow, b.Snow),
            };
        }
    }

    public static class Sky
    {
        /// <summary>Degrees north: a dry temperate reach.</summary>
        public const float Latitude = 34f;
        /// <summary>The sun's declination, degrees: late spring, for ever (sunrise ~5:30, sunset ~18:30, noon at 68°).</summary>
        public const float Declination = 12f;
        /// <summary>Where the moon hangs at night (degrees): high in the south-west, so night shadows fall north-east.</summary>
        public const float MoonElevation = 42f, MoonAzimuth = 215f;

        /// <summary>The sun's elevation and azimuth (degrees; azimuth from north towards east) at an hour (0..24).</summary>
        public static (float elevation, float azimuth) Sun(double hour)
        {
            double phi = Latitude * Math.PI / 180, dec = Declination * Math.PI / 180, h = (hour - 12) * 15 * Math.PI / 180;
            var sinEl = Math.Sin(phi) * Math.Sin(dec) + Math.Cos(phi) * Math.Cos(dec) * Math.Cos(h);
            var el = Math.Asin(sinEl);
            var cosAz = (Math.Sin(dec) - Math.Sin(el) * Math.Sin(phi)) / (Math.Cos(el) * Math.Cos(phi));
            var az = Math.Acos(Math.Clamp(cosAz, -1, 1));
            if (h > 0) az = 2 * Math.PI - az;   // afternoon: the sun is west of the meridian
            return ((float)(el * 180 / Math.PI), (float)(az * 180 / Math.PI));
        }

        /// <summary>A unit direction (x east, y up, z north) from elevation and azimuth in degrees.</summary>
        public static (float x, float y, float z) Direction(float elevation, float azimuth)
        {
            double el = elevation * Math.PI / 180, az = azimuth * Math.PI / 180;
            return ((float)(Math.Cos(el) * Math.Sin(az)), (float)Math.Sin(el), (float)(Math.Cos(el) * Math.Cos(az)));
        }

        // The clear-day look keyed on the sun's elevation (degrees), from deep night to high noon.
        private readonly struct Key
        {
            public readonly float El, Intensity;
            public readonly Rgb Light, Zenith, Horizon, Ground, Glow, AmbSky, AmbEq, AmbGround, Fog;
            public Key(float el, Rgb light, float intensity, Rgb zenith, Rgb horizon, Rgb ground, Rgb glow, Rgb ambSky, Rgb ambEq, Rgb ambGround, Rgb fog)
            { El = el; Light = light; Intensity = intensity; Zenith = zenith; Horizon = horizon; Ground = ground; Glow = glow; AmbSky = ambSky; AmbEq = ambEq; AmbGround = ambGround; Fog = fog; }
        }

        private static Rgb H(int hex) => new(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f);

        // Colours are authored in sRGB hex for reading and converted to linear once (the game renders linear).
        private static readonly Key[] Keys =
        {
            //        el    light            I     zenith           horizon          ground           glow             amb sky          amb equator      amb ground       fog
            new(-90f, H(0x8ea4d8), 0.32f, H(0x0b1426), H(0x1e2a44), H(0x0e1218), H(0x000000), H(0x3a4a70), H(0x2a3348), H(0x15171c), H(0x1f2a40)),
            new(-14f, H(0x8ea4d8), 0.32f, H(0x0d1830), H(0x24324e), H(0x10141a), H(0x000000), H(0x3c4c72), H(0x2c364c), H(0x16181e), H(0x222e46)),
            new(-6f, H(0x9aa6d0), 0.10f, H(0x24365e), H(0x8a6a78), H(0x1e1c20), H(0x7a4a50), H(0x4e5a80), H(0x5a5058), H(0x201e22), H(0x6a5a68)),
            new(-1f, H(0xff9a5c), 0.25f, H(0x3a5a8e), H(0xe0906a), H(0x3a3028), H(0xff8a50), H(0x6a7aa0), H(0x9a7a6a), H(0x2e2620), H(0xc0907a)),
            new(4f, H(0xffb47a), 1.1f, H(0x4a74b0), H(0xf0b48a), H(0x5a4a3a), H(0xffa060), H(0x8496bc), H(0xb89c84), H(0x3c3228), H(0xd8b49a)),
            new(14f, H(0xffd8a8), 1.9f, H(0x4c80c8), H(0xd8d0c4), H(0x7a6a56), H(0xffd090), H(0x8ca6d4), H(0xc4b49c), H(0x4a3e30), H(0xd8d2c8)),
            new(30f, H(0xfff0dc), 2.35f, H(0x3f7ad0), H(0xc4d6ea), H(0x8a7a62), H(0xfff0d0), H(0x8eaadc), H(0xc8bca8), H(0x52463a), H(0xd4dce4)),
            new(90f, H(0xfff6ea), 2.5f, H(0x3874d0), H(0xbcd2ec), H(0x907e66), H(0xfff6e0), H(0x90acde), H(0xcac0ae), H(0x54483a), H(0xd2dce6)),
        };

        /// <summary>sRGB to linear for one channel (the game's colour space is linear).</summary>
        public static float Linear(float c) => c <= 0.04045f ? c / 12.92f : (float)Math.Pow((c + 0.055) / 1.055, 2.4);
        public static Rgb Linear(Rgb c) => new(Linear(c.R), Linear(c.G), Linear(c.B));

        /// <summary>The look at an hour (0..24) in a weather. Colours come back linear.</summary>
        public static SkyLook At(double hour, WeatherKind weather)
        {
            var (el, az) = Sun(hour);
            int k = 0;
            while (k < Keys.Length - 2 && el > Keys[k + 1].El) k++;
            var a = Keys[k]; var b = Keys[k + 1];
            var t = Math.Clamp((el - a.El) / (b.El - a.El), 0f, 1f);   // linear between keys: easing doubled the rate mid-way
            Rgb C(Rgb x, Rgb y) => Linear(Rgb.Lerp(x, y, t));
            var look = new SkyLook
            {
                LightColour = C(a.Light, b.Light), LightIntensity = a.Intensity + (b.Intensity - a.Intensity) * t,
                Zenith = C(a.Zenith, b.Zenith), Horizon = C(a.Horizon, b.Horizon), Ground = C(a.Ground, b.Ground), SunGlow = C(a.Glow, b.Glow),
                AmbientSky = C(a.AmbSky, b.AmbSky), AmbientEquator = C(a.AmbEq, b.AmbEq), AmbientGround = C(a.AmbGround, b.AmbGround), Fog = C(a.Fog, b.Fog),
                // clear air: 95 % fogged at ~1.4 km, just past the streamed ground's edge (load radius 2)
                FogDensity = 0.0012f, Clouds = 0.18f, CloudColour = new Rgb(1, 1, 1),
            };
            // the light: the sun above -6°, the moon below (its intensity is near zero where the two hand over, so the
            // shadows' turn is not seen); the sun stays a little above the horizon for the light so shadows do not run
            // to infinity at sunrise
            (look.SunX, look.SunY, look.SunZ) = Direction(el, az);
            var night = Smooth((-el - 4f) / 8f);
            var (lx, ly, lz) = el > -6f ? Direction(Math.Max(el, 6f), az) : Direction(MoonElevation, MoonAzimuth);
            (look.LightX, look.LightY, look.LightZ) = (lx, ly, lz);
            look.Stars = night;
            look.Moon = night;
            look.ShadowStrength = el > -6f ? Math.Clamp(0.35f + el / 20f, 0.35f, 0.9f) : 0.55f;
            look.CloudColour = Rgb.Lerp(look.Horizon * 1.15f + look.LightColour * 0.25f, look.AmbientSky * 0.6f, night);
            Apply(look, weather);
            return look;
        }

        private static void Apply(SkyLook l, WeatherKind w)
        {
            // sun ×, fog density × (a storm is ~20 % haze at the game camera's 60 m, ~95 % at 200 m), cloud cover, sky to
            // grey, dust tint, particles (dust, rain, snow)
            (float sun, float fog, float clouds, float grey, float dustTint, float dust, float rain, float snow) e = w switch
            {
                WeatherKind.Clear => (1f, 1f, 0.18f, 0f, 0f, 0.3f, 0f, 0f),
                WeatherKind.Haze => (0.85f, 1.6f, 0.35f, 0.35f, 0.15f, 0.6f, 0f, 0f),
                WeatherKind.Dust => (0.6f, 4f, 0.3f, 0.5f, 0.75f, 2.0f, 0f, 0f),
                WeatherKind.Storm => (0.35f, 7f, 0.95f, 0.65f, 0.55f, 3.0f, 0f, 0f),
                WeatherKind.Rain => (0.45f, 2.2f, 0.88f, 0.6f, 0f, 0f, 1f, 0f),
                WeatherKind.Fog => (0.55f, 6f, 0.6f, 0.55f, 0f, 0.2f, 0f, 0f),
                WeatherKind.Snow => (0.7f, 2.5f, 0.8f, 0.5f, 0f, 0f, 0f, 1f),
                _ => (1f, 1f, 0.18f, 0f, 0f, 0.3f, 0f, 0f),
            };
            var dustColour = Linear(H(0xc8a47a));
            Rgb Air(Rgb c) => Rgb.Lerp(c.Grey(e.grey), dustColour * Math.Max(0.15f, c.Luma / dustColour.Luma), e.dustTint);
            l.LightIntensity *= e.sun;
            l.ShadowStrength *= 0.4f + 0.6f * e.sun;
            l.LightColour = Rgb.Lerp(l.LightColour, l.LightColour.Grey(0.5f), e.grey * 0.5f);
            l.Zenith = Air(l.Zenith); l.Horizon = Air(l.Horizon); l.Fog = Air(l.Fog);
            l.AmbientSky = Rgb.Lerp(l.AmbientSky, l.AmbientSky.Grey(1), e.grey * 0.6f);
            l.FogDensity *= e.fog;
            l.Clouds = e.clouds;
            l.CloudColour = Rgb.Lerp(l.CloudColour, l.CloudColour.Grey(1) * 0.7f, e.grey);
            l.Stars *= 1 - e.clouds;
            l.Moon *= 1 - e.clouds * 0.8f;
            l.Dust = e.dust; l.Rain = e.rain; l.Snow = e.snow;
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
