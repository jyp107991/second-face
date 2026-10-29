using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The weather you see in the air (BUILD_PLAN §6.A.6): rain, snow, drifting motes and, in dust and storms, broad
    /// sheets of blown dust, each a particle system in a box that rides with the focus. Amounts come from the look
    /// (<see cref="SkyLook.Dust"/>, <see cref="SkyLook.Rain"/>, <see cref="SkyLook.Snow"/>); colours follow the light,
    /// so dust at dusk is amber and rain at night is grey-blue. Caps are small for a phone (rain ≤ 4000 streaks).
    /// </summary>
    public sealed class WeatherLayers : MonoBehaviour
    {
        public SkyProfile Profile;
        /// <summary>Where the wind blows towards (x east, z north) and how hard in clear weather, m/s.</summary>
        public Vector2 WindTowards = new(0.92f, 0.39f);
        public float CalmWind = 2f;

        private ParticleSystem _rain, _snow, _motes, _sheets;

        private void Ensure()
        {
            if (_rain != null || Profile == null) return;
            _rain = Make("Rain", Profile.Streak, 4000, 1.4f, new Vector3(90, 1, 90), 26f, stretched: true);
            _snow = Make("Snow", Profile.Dot, 3000, 14f, new Vector3(80, 1, 80), 22f, stretched: false);
            _motes = Make("Motes", Profile.Dot, 1500, 9f, new Vector3(70, 10, 70), 4f, stretched: false);
            _sheets = Make("Dust sheets", Profile.Dot, 200, 12f, new Vector3(140, 6, 140), 3f, stretched: false);
        }

        private ParticleSystem Make(string name, Material material, int max, float life, Vector3 box, float height, bool stretched)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.loop = true; main.playOnAwake = false; main.maxParticles = max; main.startLifetime = life;
            main.startSpeed = 0f; main.simulationSpace = ParticleSystemSimulationSpace.World;
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Box; shape.scale = box; shape.position = new Vector3(0, height, 0);
            var vel = ps.velocityOverLifetime;
            vel.enabled = true; vel.space = ParticleSystemSimulationSpace.World;
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = material;
            r.renderMode = stretched ? ParticleSystemRenderMode.Stretch : ParticleSystemRenderMode.Billboard;
            r.velocityScale = stretched ? 0.045f : 0f;
            r.lengthScale = 1f;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            var emission = ps.emission; emission.rateOverTime = 0;
            ps.Play();
            return ps;
        }

        /// <summary>Sets the amounts, the wind and the colours from a look, and moves the boxes to the focus.</summary>
        public void Set(SkyLook look, Vector3 focus)
        {
            Ensure();
            if (_rain == null) return;
            transform.position = focus;
            var storm = Mathf.Clamp01(look.Dust - 1f);
            var wind = WindTowards.normalized * (CalmWind + 5f * Mathf.Clamp01(look.Dust - 0.5f) + 7f * storm);
            // what lights the particles: the ambient plus a share of the direct light, from the look's linear colours
            var light = new Color(look.AmbientEquator.R + look.LightColour.R * look.LightIntensity * 0.25f,
                                  look.AmbientEquator.G + look.LightColour.G * look.LightIntensity * 0.25f,
                                  look.AmbientEquator.B + look.LightColour.B * look.LightIntensity * 0.25f);
            Color Lit(float r, float g, float b, float a) => new Color(Mathf.Min(1, r * light.r), Mathf.Min(1, g * light.g), Mathf.Min(1, b * light.b), a).gamma;
            Layer(_rain, 3200f * look.Rain, new Vector3(wind.x * 0.6f, -22f, wind.y * 0.6f), Lit(0.8f, 0.85f, 0.9f, 0.35f), 0.02f, 0.03f);
            Layer(_snow, 1400f * look.Snow, new Vector3(wind.x * 0.5f, -1.4f, wind.y * 0.5f), Lit(1f, 1f, 1f, 0.9f), 0.05f, 0.09f);
            Layer(_motes, 90f * look.Dust, new Vector3(wind.x, 0.15f, wind.y), Lit(1f, 0.9f, 0.72f, 0.55f), 0.03f, 0.08f);
            Layer(_sheets, 9f * Mathf.Clamp01(look.Dust - 0.8f) * 2f, new Vector3(wind.x * 1.4f, 0.4f, wind.y * 1.4f), Lit(0.95f, 0.8f, 0.6f, 0.13f), 9f, 22f);
        }

        private static void Layer(ParticleSystem ps, float rate, Vector3 velocity, Color colour, float minSize, float maxSize)
        {
            var emission = ps.emission; emission.rateOverTime = rate;
            var vel = ps.velocityOverLifetime;
            vel.x = new ParticleSystem.MinMaxCurve(velocity.x * 0.8f, velocity.x * 1.2f);
            vel.y = new ParticleSystem.MinMaxCurve(velocity.y * 0.9f, velocity.y * 1.1f);
            vel.z = new ParticleSystem.MinMaxCurve(velocity.z * 0.8f, velocity.z * 1.2f);
            var main = ps.main;
            main.startColor = colour;
            main.startSize = new ParticleSystem.MinMaxCurve(minSize, maxSize);
        }

        /// <summary>Fills the air at once (captures; a weather change otherwise builds up over a few seconds).</summary>
        public void Prewarm(float seconds)
        {
            foreach (var ps in new[] { _rain, _snow, _motes, _sheets })
                if (ps != null) { ps.Simulate(seconds, true, false, false); ps.Play(); }
        }
    }
}
