using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The picture of a recorded memory (the content's <c>reverie</c>; the web game's cold grade): while one plays the
    /// world goes cold, washed and grainy, the edges closing in. A global post-processing volume of its own over the look
    /// (<see cref="Look"/>, priority above it), made at run time and blended in and out over <see cref="FadeSeconds"/> of
    /// real time (a conversation does not stop the clock, a menu might): colour adjustments (desaturated, a cold filter,
    /// a little lifted and flattened), a closing vignette and film grain. Cheap on a phone: the same uber post pass the
    /// look already runs, a few more parameters. Nothing changes the look's own profile, so the picture comes back as it
    /// was.
    /// </summary>
    public sealed class Reverie : MonoBehaviour
    {
        public const string VolumeName = "Reverie";
        /// <summary>The volume's priority: over the look's (0).</summary>
        public const float Priority = 50f;
        public float FadeSeconds = 0.9f;

        public Volume Volume { get; private set; }
        /// <summary>A memory is playing (the picture is going or gone cold).</summary>
        public bool On { get; private set; }
        /// <summary>How far the picture has gone cold, 0..1.</summary>
        public float Weight => Volume != null ? Volume.weight : 0f;

        private VolumeProfile _profile;

        /// <summary>Makes the reverie's volume under <paramref name="parent"/> (its weight 0 until a memory begins).</summary>
        public static Reverie Create(Transform parent = null)
        {
            var go = new GameObject(VolumeName);
            if (parent != null) go.transform.SetParent(parent, false);
            var r = go.AddComponent<Reverie>();
            r.Build();
            return r;
        }

        private void Build()
        {
            _profile = ScriptableObject.CreateInstance<VolumeProfile>();
            _profile.name = VolumeName;
            var colour = _profile.Add<ColorAdjustments>();
            colour.saturation.Override(-62f);
            colour.contrast.Override(-14f);
            colour.postExposure.Override(0.25f);
            colour.colorFilter.Override(new Color(0.84f, 0.95f, 1.12f));
            var vignette = _profile.Add<Vignette>();
            vignette.intensity.Override(0.42f);
            vignette.smoothness.Override(0.5f);
            vignette.color.Override(new Color(0.04f, 0.06f, 0.09f));
            var grain = _profile.Add<FilmGrain>();
            grain.type.Override(FilmGrainLookup.Medium3);
            grain.intensity.Override(0.35f);
            grain.response.Override(0.75f);
            Volume = gameObject.AddComponent<Volume>();
            Volume.isGlobal = true;
            Volume.priority = Priority;
            Volume.sharedProfile = _profile;
            Volume.weight = 0f;
            Volume.enabled = false;
        }

        /// <summary>The memory begins: the picture goes cold.</summary>
        public void Begin() => On = true;

        /// <summary>The memory ends: the picture comes back.</summary>
        public void End() => On = false;

        /// <summary>Straight to the end state (no blend: tests, a load).</summary>
        public void Snap()
        {
            if (Volume == null) return;
            Volume.weight = On ? 1f : 0f;
            Volume.enabled = On;
        }

        private void Update()
        {
            if (Volume == null) return;
            var goal = On ? 1f : 0f;
            if (Mathf.Approximately(Volume.weight, goal)) return;
            Volume.weight = Mathf.MoveTowards(Volume.weight, goal, Time.unscaledDeltaTime / Mathf.Max(0.01f, FadeSeconds));
            // (off and faded: nothing of it is left in the stack)
            Volume.enabled = Volume.weight > 0f || On;
        }

        private void OnDestroy()
        {
            if (_profile != null) Destroy(_profile);
        }
    }
}
