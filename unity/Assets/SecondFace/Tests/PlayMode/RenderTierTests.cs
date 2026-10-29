using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace SecondFace.Tests
{
    /// <summary>The two rendering tiers (BUILD_PLAN §6.Q): Vulkan gets Forward+ and the GPU Resident Drawer, GLES3 plain
    /// Forward; the boot picks by graphics API.</summary>
    public class RenderTierTests
    {
        [Test]
        public void EachGraphicsApiGetsItsTier()
        {
            Assert.That(RenderTier.For(GraphicsDeviceType.Vulkan), Is.EqualTo(RenderTier.Vulkan));
            Assert.That(RenderTier.For(GraphicsDeviceType.OpenGLES3), Is.EqualTo(RenderTier.Gles));
            Assert.That(RenderTier.For(GraphicsDeviceType.OpenGLCore), Is.EqualTo(RenderTier.Gles), "anything else falls back to the safe tier");
        }

        [Test]
        public void TheQualityLevelsCarryTheirTiersPipelines()
        {
            var names = QualitySettings.names;
            Assert.That(names, Is.EqualTo(new[] { RenderTier.Vulkan, RenderTier.Gles }));
            var vulkan = QualitySettings.GetRenderPipelineAssetAt(0) as UniversalRenderPipelineAsset;
            var gles = QualitySettings.GetRenderPipelineAssetAt(1) as UniversalRenderPipelineAsset;
            Assert.That(vulkan, Is.Not.Null); Assert.That(gles, Is.Not.Null); Assert.That(vulkan, Is.Not.SameAs(gles));
            Assert.That(vulkan.gpuResidentDrawerMode, Is.EqualTo(GPUResidentDrawerMode.InstancedDrawing));
            Assert.That(gles.gpuResidentDrawerMode, Is.EqualTo(GPUResidentDrawerMode.Disabled));
            Assert.That(((UniversalRendererData)vulkan.rendererDataList[0]).renderingMode, Is.EqualTo(RenderingMode.ForwardPlus));
            Assert.That(((UniversalRendererData)gles.rendererDataList[0]).renderingMode, Is.EqualTo(RenderingMode.Forward));
            Assert.That(vulkan.useSRPBatcher && gles.useSRPBatcher, Is.True);
        }
    }
}
