using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Portraits rendered in the engine (BUILD_PLAN P4 step 6): a person's head drawn into a square texture under a fixed
    /// studio light (a warm key from the front left, a cool fill, a rim from behind, a neutral ambient, no fog), whatever
    /// the hour or the weather where they stand, and kept: asked again for the same person and the same key (an outfit
    /// state, "aged" for the photograph), the texture comes back at once. The person is drawn where they are, alone (their
    /// renderers on <see cref="Layer"/> for the one render, at their nearest level of detail); the world's lights,
    /// ambient and fog are set aside for that render and put back. The UI shows the texture: no wait.
    /// </summary>
    public static class Portraits
    {
        /// <summary>The layer a person is drawn on for their portrait (unused by anything else).</summary>
        public const int Layer = 31;
        public const int Size = 256;

        private static readonly Dictionary<(int, string), RenderTexture> Cache = new();
        private static Camera _camera;
        private static Light _key, _fill, _rim;

        /// <summary>The cached portraits (tests read it).</summary>
        public static int Count => Cache.Count;

        /// <summary>The person's portrait for a key (an outfit state; "aged" draws the aged face), made once.</summary>
        public static RenderTexture Of(GameObject person, string key = "", int size = Size)
        {
            if (person == null) return null;
            var id = (person.GetInstanceID(), key ?? "");
            if (Cache.TryGetValue(id, out var rt) && rt != null && rt.IsCreated()) return rt;
            rt = new RenderTexture(size, size, 24, RenderTextureFormat.ARGB32) { name = $"portrait {person.name} {key}" };
            rt.Create();
            Render(person, rt, key == "aged");
            Cache[id] = rt;
            return rt;
        }

        /// <summary>Drops a person's portraits (their outfit or face changed).</summary>
        public static void Forget(GameObject person)
        {
            if (person == null) return;
            var gone = new List<(int, string)>();
            foreach (var k in Cache.Keys) if (k.Item1 == person.GetInstanceID()) gone.Add(k);
            foreach (var k in gone) { Cache[k].Release(); Object.Destroy(Cache[k]); Cache.Remove(k); }
        }

        private static void Rig()
        {
            if (_camera != null) return;
            var go = new GameObject("Portraits");
            Object.DontDestroyOnLoad(go);
            _camera = go.AddComponent<Camera>();
            _camera.enabled = false;
            _camera.cullingMask = 1 << Layer;
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = new Color(0.36f, 0.33f, 0.29f, 1f);   // the notebook's dark paper
            _camera.fieldOfView = 20f;
            _camera.nearClipPlane = 0.05f; _camera.farClipPlane = 10f;
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

        private static void Render(GameObject person, RenderTexture rt, bool aged)
        {
            Rig();
            var animator = person.GetComponentInChildren<Animator>();
            var head = animator != null && animator.isHuman ? animator.GetBoneTransform(HumanBodyBones.Head) : null;
            var root = person.transform;
            var at = head != null ? head.position + Vector3.up * 0.05f : root.position + Vector3.up * 1.6f;
            // which way the face looks: from the head to the eyes (a person not yet animated stands in the model's own pose,
            // which faces away from the Humanoid forward the animation turns them to)
            var forward = Vector3.ProjectOnPlane(root.forward, Vector3.up).normalized;
            Renderer eyes = null;
            foreach (var r in person.GetComponentsInChildren<Renderer>()) if (r.name.StartsWith("Eyes_")) { eyes = r; break; }
            if (eyes != null && head != null)
            {
                var look = Vector3.ProjectOnPlane(eyes.bounds.center - head.position, Vector3.up);
                if (look.magnitude > 0.02f) forward = look.normalized;
            }
            if (forward.sqrMagnitude < 0.5f) forward = Vector3.forward;
            var right = Vector3.Cross(Vector3.up, forward);
            // three-quarter view from the front left, a little above the eyes
            _camera.transform.position = at + forward * 0.95f + right * -0.28f + Vector3.up * 0.04f;
            _camera.transform.LookAt(at);
            _key.transform.rotation = Quaternion.LookRotation(-forward + right * 0.7f + Vector3.down * 0.5f);
            _fill.transform.rotation = Quaternion.LookRotation(-forward - right * 0.9f + Vector3.down * 0.1f);
            _rim.transform.rotation = Quaternion.LookRotation(forward + Vector3.down * 0.3f);

            // the person alone, near, aged if asked
            var renderers = person.GetComponentsInChildren<Renderer>();
            var layers = new int[renderers.Length];
            for (var i = 0; i < renderers.Length; i++) { layers[i] = renderers[i].gameObject.layer; renderers[i].gameObject.layer = Layer; }
            var lod = person.GetComponentInChildren<LODGroup>();
            lod?.ForceLOD(0);
            var sculpt = person.GetComponentInChildren<FaceSculpt>();
            var age = sculpt != null ? sculpt.Aged : 0f;
            if (sculpt != null && aged) { sculpt.Aged = 1f; sculpt.Apply(); }

            // the studio's light for this one render: the world's lights, ambient and fog set aside
            var lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
            var on = new bool[lights.Length];
            for (var i = 0; i < lights.Length; i++) { on[i] = lights[i].enabled; if (lights[i] != _key && lights[i] != _fill && lights[i] != _rim) lights[i].enabled = false; }
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
                for (var i = 0; i < lights.Length; i++) if (lights[i] != _key && lights[i] != _fill && lights[i] != _rim) lights[i].enabled = on[i];
                if (sculpt != null && aged) { sculpt.Aged = age; sculpt.Apply(); }
                lod?.ForceLOD(-1);
                for (var i = 0; i < renderers.Length; i++) if (renderers[i] != null) renderers[i].gameObject.layer = layers[i];
            }
        }
    }
}
