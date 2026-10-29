using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The studio people are drawn in for the interface (the portraits, P4.6; the pack's figure, P5.3h): one camera that
    /// sees only <see cref="Layer"/>, and a fixed light (a warm key from the front left, a cool fill, a rim from behind, a
    /// neutral trilight ambient, no fog), whatever the hour or the weather. For each render the world's lights, ambient,
    /// fog and sun are set aside and put back after.
    /// </summary>
    public static class Studio
    {
        /// <summary>The layer drawn in the studio (unused by anything else).</summary>
        public const int Layer = 31;

        private static Camera _camera;
        private static Light _key, _fill, _rim;

        public static Camera Camera { get { Rig(); return _camera; } }

        private static void Rig()
        {
            if (_camera != null) return;
            var go = new GameObject("Studio");
            Object.DontDestroyOnLoad(go);
            _camera = go.AddComponent<Camera>();
            _camera.enabled = false;
            _camera.cullingMask = 1 << Layer;
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.nearClipPlane = 0.05f;
            _camera.farClipPlane = 12f;
            Light Make(string name, Color c, float intensity)
            {
                var l = new GameObject(name).AddComponent<Light>();
                l.transform.SetParent(go.transform, false);
                l.type = LightType.Directional; l.color = c; l.intensity = intensity; l.shadows = LightShadows.None;
                l.cullingMask = 1 << Layer;
                l.enabled = false;
                return l;
            }
            _key = Make("key", new Color(1f, 0.93f, 0.84f), 1.5f);
            _fill = Make("fill", new Color(0.72f, 0.8f, 1f), 0.45f);
            _rim = Make("rim", new Color(1f, 0.95f, 0.88f), 0.9f);
        }

        /// <summary>Turns the light to a subject facing <paramref name="forward"/> (the camera in front of them).</summary>
        public static void Light(Vector3 forward)
        {
            Rig();
            forward = Vector3.ProjectOnPlane(forward, Vector3.up).normalized;
            if (forward.sqrMagnitude < 0.5f) forward = Vector3.forward;
            var right = Vector3.Cross(Vector3.up, forward);
            _key.transform.rotation = Quaternion.LookRotation(-forward + right * 0.7f + Vector3.down * 0.5f);
            _fill.transform.rotation = Quaternion.LookRotation(-forward - right * 0.9f + Vector3.down * 0.1f);
            _rim.transform.rotation = Quaternion.LookRotation(forward + Vector3.down * 0.3f);
        }

        /// <summary>Draws what the studio camera sees into a texture under the studio's light alone.</summary>
        public static void Render(RenderTexture rt)
        {
            Rig();
            var lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
            var on = new bool[lights.Length];
            bool Ours(Light l) => l == _key || l == _fill || l == _rim;
            for (var i = 0; i < lights.Length; i++) { on[i] = lights[i].enabled; if (!Ours(lights[i])) lights[i].enabled = false; }
            _key.enabled = _fill.enabled = _rim.enabled = true;
            var (mode, sky, equator, ground, fog, sun) = (RenderSettings.ambientMode, RenderSettings.ambientSkyColor, RenderSettings.ambientEquatorColor,
                RenderSettings.ambientGroundColor, RenderSettings.fog, RenderSettings.sun);
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.42f, 0.44f, 0.48f);
            RenderSettings.ambientEquatorColor = new Color(0.36f, 0.34f, 0.32f);
            RenderSettings.ambientGroundColor = new Color(0.2f, 0.18f, 0.16f);
            RenderSettings.fog = false;
            RenderSettings.sun = _key;
            try
            {
                var request = new RenderPipeline.StandardRequest { destination = rt };
                if (RenderPipeline.SupportsRenderRequest(_camera, request)) RenderPipeline.SubmitRenderRequest(_camera, request);
                else { _camera.targetTexture = rt; _camera.Render(); _camera.targetTexture = null; }
            }
            finally
            {
                RenderSettings.ambientMode = mode; RenderSettings.ambientSkyColor = sky; RenderSettings.ambientEquatorColor = equator;
                RenderSettings.ambientGroundColor = ground; RenderSettings.fog = fog; RenderSettings.sun = sun;
                _key.enabled = _fill.enabled = _rim.enabled = false;
                for (var i = 0; i < lights.Length; i++) if (lights[i] != null && !Ours(lights[i])) lights[i].enabled = on[i];
            }
        }
    }
}
