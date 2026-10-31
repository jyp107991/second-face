using UnityEditor;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Microsoft Rocketbox avatars under evaluation (Assets/ThirdParty/Rocketbox: MIT, docs/PEOPLE_RESEARCH.md §7): their
    /// FBX as a humanoid (3ds Max biped bones, Bip01), their textures with the normal maps marked so. Scoped to that folder;
    /// Rocketbox's own postprocessor is project-wide and is not used.
    /// </summary>
    public sealed class RocketboxImportPostprocessor : AssetPostprocessor
    {
        public override uint GetVersion() => 1;

        private const string Dir = "Assets/ThirdParty/Rocketbox/";

        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith(Dir)) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importAnimation = false;
            imp.importBlendShapes = true;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(Dir)) return;
            var imp = (TextureImporter)assetImporter;
            if (assetPath.ToLowerInvariant().Contains("normal"))
            {
                imp.textureType = TextureImporterType.NormalMap;
                imp.convertToNormalmap = false;
            }
            imp.maxTextureSize = 2048;
        }
    }
}
