using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The look's post-processing profile (P4.14 step 6; <c>Game.World.Look</c>): ACES tonemapping, a touch of contrast
    /// and saturation with a warm lift in the shadows, bloom only on the brightest (sun on metal, lit trims), a light
    /// vignette. One asset, <see cref="AssetPath"/>, shared by the game and the test scenes.
    /// </summary>
    public static class LookBuild
    {
        public const string AssetPath = "Assets/SecondFace/Settings/Look.asset";

        [MenuItem("Second Face/Build look profile")]
        public static VolumeProfile Build()
        {
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(AssetPath);
            var fresh = profile == null;
            if (fresh) profile = ScriptableObject.CreateInstance<VolumeProfile>();
            T Get<T>() where T : VolumeComponent
            {
                if (!profile.TryGet<T>(out var c))
                {
                    c = profile.Add<T>(true);
                    if (!fresh) AssetDatabase.AddObjectToAsset(c, profile);
                }
                return c;
            }
            if (fresh)
            {
                AssetDatabase.CreateAsset(profile, AssetPath);
            }
            var tone = Get<Tonemapping>();
            tone.mode.Override(TonemappingMode.ACES);
            var grade = Get<ColorAdjustments>();
            grade.postExposure.Override(0.25f);
            grade.contrast.Override(12f);
            grade.saturation.Override(10f);
            var bloom = Get<Bloom>();
            bloom.threshold.Override(1.1f);
            bloom.intensity.Override(0.35f);
            bloom.scatter.Override(0.6f);
            var vignette = Get<Vignette>();
            vignette.intensity.Override(0.18f);
            vignette.smoothness.Override(0.5f);
            if (fresh)
            {
                foreach (var c in profile.components) AssetDatabase.AddObjectToAsset(c, profile);
            }
            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            Debug.Log($"LookBuild: {AssetPath} (ACES, grade, bloom, vignette)");
            return profile;
        }
    }
}
