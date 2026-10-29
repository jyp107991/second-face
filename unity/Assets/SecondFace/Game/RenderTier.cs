using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game
{
    /// <summary>
    /// The two rendering tiers (BUILD_PLAN §6.Q, §6.K), chosen at boot by the graphics API: on Vulkan the "Vulkan"
    /// quality level (Forward+ and the GPU Resident Drawer, which need compute), on OpenGL ES 3 (older or quirky phones)
    /// the "GLES3" level (Forward, no resident drawer, lighter density). The quality levels and their URP assets are made
    /// by the editor's ProjectSetup.
    /// </summary>
    public static class RenderTier
    {
        public const string Vulkan = "Vulkan", Gles = "GLES3";

        /// <summary>The quality level for a graphics API.</summary>
        public static string For(GraphicsDeviceType api) => api == GraphicsDeviceType.Vulkan ? Vulkan : Gles;

        /// <summary>Switches to the level for the running device's API (no-op when it is already active or missing).</summary>
        public static void Apply()
        {
            var i = Array.IndexOf(QualitySettings.names, For(SystemInfo.graphicsDeviceType));
            if (i >= 0 && QualitySettings.GetQualityLevel() != i) QualitySettings.SetQualityLevel(i, true);
        }
    }
}
