using UnityEditor;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Import rules for the fetched texture library (Assets/External/Textures, written by tools/unity/assets.py):
    /// normal maps as normal maps, data maps linear, mip streaming on, ASTC on Android. The meta files the script
    /// writes already say this; this keeps it true if someone reimports by hand.
    /// </summary>
    public sealed class ExternalTexturePostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 2;

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/External/Textures/")) return;
            var imp = (TextureImporter)assetImporter;
            var name = System.IO.Path.GetFileNameWithoutExtension(assetPath);
            var kind = name.Substring(name.LastIndexOf('_') + 1);
            imp.textureType = kind == "n" ? TextureImporterType.NormalMap : TextureImporterType.Default;
            imp.sRGBTexture = kind == "d";
            imp.streamingMipmaps = true;
            imp.mipmapEnabled = true;
            imp.anisoLevel = 4;
            imp.maxTextureSize = 2048;
            var android = imp.GetPlatformTextureSettings("Android");
            android.overridden = true;
            android.maxTextureSize = 2048;
            android.format = kind == "mask" ? TextureImporterFormat.ASTC_6x6 : TextureImporterFormat.ASTC_6x6;
            imp.SetPlatformTextureSettings(android);
        }
    }
}
