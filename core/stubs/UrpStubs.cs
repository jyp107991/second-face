// Minimal stand-ins for the URP package types ProjectSetup uses (the package ships as source; not compiled here).
namespace UnityEngine.Rendering.Universal
{
    public class UniversalRendererData : ScriptableObject { }
    public class UniversalRenderPipelineAsset : RenderPipelineAsset
    {
        public static UniversalRenderPipelineAsset Create(UniversalRendererData rendererData = null) => null;
        public bool supportsHDR { get; set; }
        public int msaaSampleCount { get; set; }
        public float renderScale { get; set; }
        public float shadowDistance { get; set; }
        public int shadowCascadeCount { get; set; }
        public bool supportsCameraDepthTexture { get; set; }
        protected override RenderPipeline CreatePipeline() => null;
    }
}
