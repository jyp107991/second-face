using UnityEditor;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Baked nature models (Assets/SecondFace/Models/Nature, written by tools/unity/models_bake.py): FBX like the kits
    /// (axis conversion baked, slot names kept for <see cref="MaterialLibrary.Bind"/>, no colliders: they are scattered by
    /// the thousand), and their textures in tex/ (base colour with its alpha for cut-out leaves, normal maps, ASTC).
    /// </summary>
    public sealed class NatureImportPostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 1;

        private const string Dir = "Assets/SecondFace/Models/Nature/";

        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith(Dir)) return;
            var imp = (ModelImporter)assetImporter;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            imp.bakeAxisConversion = true;
            imp.addCollider = false;
            imp.isReadable = false;
            imp.importAnimation = false;
            imp.importBlendShapes = false;
            imp.importNormals = ModelImporterNormals.Import;
            imp.meshCompression = ModelImporterMeshCompression.Off;
            imp.generateSecondaryUV = false;
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(Dir + "tex/")) return;
            var imp = (TextureImporter)assetImporter;
            var name = System.IO.Path.GetFileNameWithoutExtension(assetPath);
            var normal = name.EndsWith("_n");
            imp.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            imp.sRGBTexture = !normal;
            // The generated metas say "no alpha" (a template made for terrain textures); leaves are their alpha.
            imp.alphaSource = normal ? TextureImporterAlphaSource.None : TextureImporterAlphaSource.FromInput;
            imp.alphaIsTransparency = !normal;
            imp.mipmapEnabled = true;
            imp.streamingMipmaps = true;
            imp.maxTextureSize = 1024;
            var android = imp.GetPlatformTextureSettings("Android");
            android.overridden = true; android.maxTextureSize = 1024; android.format = TextureImporterFormat.ASTC_6x6;
            imp.SetPlatformTextureSettings(android);
        }
    }
}
