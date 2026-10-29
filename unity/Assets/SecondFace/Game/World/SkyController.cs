using System.Collections.Generic;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The sky, the sun and the air (BUILD_PLAN §6.A.6): reads the hour from <see cref="TimeService"/>, the region round
    /// the focus from <see cref="WorldService"/>, asks Core's <see cref="Sky"/> and <see cref="Weather"/> for the look
    /// and applies it: the one directional light (the sun by day, the moon by night: one shadow-casting light, as a phone
    /// wants), the trilight ambient, exponential-squared fog, the procedural sky material and the weather's particle
    /// layers. Regions' weather blends across a border over <see cref="BlendRadius"/>; a change of weather blends over
    /// the two hours before dawn. The look is recomputed ten times a second (the sun moves a quarter of a degree a real
    /// second at the default clock), not every frame.
    /// </summary>
    public sealed class SkyController : MonoBehaviour
    {
        public TimeService Clock;
        public WorldService World;
        public SkyProfile Profile;
        public Light Sun;
        /// <summary>A fixed weather for tests and captures; null follows the regions and the days.</summary>
        public WeatherKind? Force;
        public float BlendRadius = 300f;
        public float UpdateInterval = 0.1f;

        public SkyLook Look { get; private set; }

        private Material _sky;
        private WeatherLayers _layers;
        private float _since = 999f;
        private readonly Dictionary<int, float> _regions = new();
        private readonly Dictionary<(string, int), WeatherKind> _days = new();
        private double _envAt = -999;

        // no Awake: the sun is made at the first look only if none was handed over by then (the stage hands over the
        // scene's own in the frame it adds the sky; one made in Awake was left burning beside it, sideways, round the clock)

        private void Ensure()
        {
            if (_sky != null) return;
            if (Sun == null)
            {
                Sun = new GameObject("Sun").AddComponent<Light>();
                Sun.transform.SetParent(transform, false);
                Sun.type = LightType.Directional;
                Sun.shadows = LightShadows.Soft;
            }
            RenderSettings.sun = Sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            if (Profile != null && Profile.Sky != null)
            {
                _sky = new Material(Profile.Sky) { name = "Sky (live)" };   // an instance: the asset stays as committed
                RenderSettings.skybox = _sky;
            }
            _layers = gameObject.GetComponent<WeatherLayers>() ?? gameObject.AddComponent<WeatherLayers>();
            _layers.Profile = Profile;
        }

        private void LateUpdate()
        {
            _since += Time.deltaTime;
            if (_since < UpdateInterval) return;
            _since = 0;
            Apply();
        }

        /// <summary>Computes the look now and applies it (tests and captures call this after setting the hour).</summary>
        public void Apply()
        {
            Ensure();
            var hour = Clock != null ? Clock.Hour : 13.0;
            var day = Clock != null ? Clock.Day : 1;
            Look = Compute(hour, day);
            var l = Look;
            var towards = new Vector3(l.LightX, l.LightY, l.LightZ);
            Sun.transform.rotation = Quaternion.LookRotation(-towards, Vector3.up);
            Sun.color = Col(l.LightColour);
            Sun.intensity = l.LightIntensity;
            Sun.shadowStrength = l.ShadowStrength;
            RenderSettings.ambientSkyColor = Col(l.AmbientSky);
            RenderSettings.ambientEquatorColor = Col(l.AmbientEquator);
            RenderSettings.ambientGroundColor = Col(l.AmbientGround);
            RenderSettings.fogColor = Col(l.Fog);
            RenderSettings.fogDensity = l.FogDensity;
            if (_sky != null)
            {
                _sky.SetColor("_Zenith", Col(l.Zenith));
                _sky.SetColor("_Horizon", Col(l.Horizon));
                _sky.SetColor("_Ground", Col(l.Ground));
                _sky.SetColor("_SunGlow", Col(l.SunGlow));
                _sky.SetColor("_Fog", Col(l.Fog));
                _sky.SetVector("_SunDir", new Vector4(l.SunX, l.SunY, l.SunZ, 0));
                var (mx, my, mz) = Sky.Direction(Sky.MoonElevation, Sky.MoonAzimuth);
                _sky.SetVector("_MoonDir", new Vector4(mx, my, mz, 0));
                _sky.SetFloat("_Clouds", l.Clouds);
                _sky.SetColor("_CloudColour", Col(l.CloudColour));
                _sky.SetFloat("_Stars", l.Stars);
                _sky.SetFloat("_Moon", l.Moon);
            }
            var focus = World != null ? World.Focus : transform.position;
            _layers.Set(l, focus);
            // the reflections and the ambient probe follow the sky every half game hour (a few ms on a phone; P3.7
            // measures it), not every update
            var minutes = Clock != null ? Clock.Minutes : 0;
            if (System.Math.Abs(minutes - _envAt) >= 30) { _envAt = minutes; DynamicGI.UpdateEnvironment(); }
        }

        private SkyLook Compute(double hour, int day)
        {
            if (Force is WeatherKind f) return Sky.At(hour, f);
            if (World == null || !World.Ready) return Sky.At(hour, WeatherKind.Clear);
            Regions(World.Focus.x, World.Focus.z);
            SkyLook acc = null; float total = 0;
            foreach (var kv in _regions)
            {
                var look = RegionLook(World.Layout.Biomes[kv.Key], hour, day);
                total += kv.Value;
                acc = acc == null ? look : SkyLook.Lerp(acc, look, kv.Value / total);
            }
            return acc ?? Sky.At(hour, WeatherKind.Clear);
        }

        /// <summary>A region's look on a day; the day's weather comes in over the two hours before dawn.</summary>
        private SkyLook RegionLook(string region, double hour, int day)
        {
            var seed = Clock != null ? Clock.Seed : 0;
            var today = WeatherOn(region, day, seed);
            if (hour >= 4 && hour < 6)
            {
                var before = WeatherOn(region, day - 1, seed);
                if (before != today) return SkyLook.Lerp(Sky.At(hour, before), Sky.At(hour, today), (float)(hour - 4) / 2f);
            }
            return Sky.At(hour, today);
        }

        private WeatherKind WeatherOn(string region, int day, int seed)
        {
            if (_days.TryGetValue((region, day), out var w)) return w;
            if (_days.Count > 256) _days.Clear();
            return _days[(region, day)] = Weather.For(region, day, seed);
        }

        /// <summary>The regions round the focus: its own (weight 2) and six points on a ring <see cref="BlendRadius"/> out.</summary>
        private void Regions(float x, float z)
        {
            _regions.Clear();
            void Add(int b, float v) => _regions[b] = _regions.TryGetValue(b, out var o) ? o + v : v;
            Add(World.Control.Sample(x, z).Biome, 2f);
            for (var k = 0; k < 6; k++)
            {
                var a = k * Mathf.PI / 3;
                Add(World.Control.Sample(x + Mathf.Cos(a) * BlendRadius, z + Mathf.Sin(a) * BlendRadius).Biome, 1f);
            }
        }

        /// <summary>Core's colours are linear; Unity's light, ambient, fog and material colours are given in sRGB.</summary>
        private static Color Col(Rgb c) => new Color(c.R, c.G, c.B).gamma;
    }
}
