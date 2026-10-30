using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The look (P4.14 step 6, the owner: push the graphics): one post-processing profile for the whole game (ACES
    /// tonemapping over an HDR frame, a little contrast and saturation, bloom on the brightest, a light vignette), as a
    /// global volume, and the camera set to render it. Built by <c>LookBuild</c> into
    /// <c>Assets/SecondFace/Settings/Look.asset</c> and carried by <see cref="WorldAssets.Look"/>; the test scenes add it
    /// the same way, so a capture shows what the phone shows.
    /// </summary>
    public static class Look
    {
        public const string VolumeName = "Look";

        /// <summary>Adds the look's global volume to the scene (once) and turns post-processing on for a camera.</summary>
        public static Volume Apply(Camera camera, VolumeProfile profile)
        {
            Volume volume = null;
            foreach (var v in Object.FindObjectsByType<Volume>(FindObjectsSortMode.None))
                if (v.gameObject.name == VolumeName) { volume = v; break; }
            if (volume == null)
            {
                var go = new GameObject(VolumeName);
                volume = go.AddComponent<Volume>();
                volume.isGlobal = true;
                volume.priority = 0f;
            }
            if (profile != null) volume.sharedProfile = profile;
            if (camera != null)
            {
                var data = camera.GetUniversalAdditionalCameraData();
                data.renderPostProcessing = true;
                data.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
                camera.allowHDR = true;
            }
            return volume;
        }
    }
}
