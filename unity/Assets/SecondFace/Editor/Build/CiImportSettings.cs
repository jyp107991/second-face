using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// CI import safety: the Linux editor's Crunch texture compressor asserts inside the GameCI container
    /// (crnlib threading) and takes the whole test run down while importing crunched package textures (VFX Graph
    /// icons, run 12). The Android build never hits it (Android imports as ASTC). In batch mode on Linux every
    /// texture, packages included, imports without crunch; the player builds are unaffected.
    /// </summary>
    public sealed class CiImportSettings : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 2;

        private void OnPreprocessTexture()
        {
            if (!Application.isBatchMode || Application.platform != RuntimePlatform.LinuxEditor) return;
            var imp = (TextureImporter)assetImporter;
            if (imp.crunchedCompression) imp.crunchedCompression = false;
        }
    }
}
