using System.IO;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// People models (Assets/SecondFace/People) import as Humanoid with blend shapes; their material slots name their
    /// textures (skin:&lt;file&gt;, hair:&lt;file&gt;, brows:, lashes:, eyes:) which live beside the model in tex/.
    /// </summary>
    public sealed class PeopleImportPostprocessor : AssetPostprocessor
    {
        private bool IsPerson => assetPath.StartsWith("Assets/SecondFace/People/");

        private void OnPreprocessModel()
        {
            if (!IsPerson) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importBlendShapes = true;
            imp.importBlendShapeNormals = ModelImporterNormals.None;
            imp.importNormals = ModelImporterNormals.Calculate;
            imp.normalCalculationMode = ModelImporterNormalCalculationMode.AreaAndAngleWeighted;
            imp.normalSmoothingAngle = 80f;
            imp.isReadable = false;
            imp.meshCompression = ModelImporterMeshCompression.Off;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            imp.optimizeGameObjects = false;
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/SecondFace/People/")) return;
            var imp = (TextureImporter)assetImporter;
            var name = Path.GetFileNameWithoutExtension(assetPath);
            var normal = name.EndsWith("_n");
            imp.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            imp.sRGBTexture = !normal;
            imp.alphaIsTransparency = !normal;
            imp.mipmapEnabled = true;
            imp.streamingMipmaps = true;
            imp.maxTextureSize = 2048;
            var android = imp.GetPlatformTextureSettings("Android");
            android.overridden = true; android.maxTextureSize = 2048; android.format = TextureImporterFormat.ASTC_6x6;
            imp.SetPlatformTextureSettings(android);
        }

        private Material OnAssignMaterialModel(Material material, Renderer renderer)
        {
            if (!IsPerson) return null;
            var name = material.name.StartsWith("mat_") ? material.name.Substring(4) : material.name;   // slots are mat_<kind>:<texture>
            var colon = name.IndexOf(':');
            if (colon < 0) return null;
            var kind = name.Substring(0, colon);
            var tex = name.Substring(colon + 1);
            var dir = Path.GetDirectoryName(assetPath).Replace('\\', '/');
            var matDir = dir + "/Materials";
            Directory.CreateDirectory(matDir);
            var matPath = $"{matDir}/{kind}_{tex}.mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (existing != null) return existing;
            var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = $"{kind}_{tex}" };
            var d = tex == "none" ? null : AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex}.png");
            if (d != null) m.SetTexture("_BaseMap", d);
            var n = AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex.Replace("_d", "_n")}.png");
            if (n != null && tex.EndsWith("_d")) { m.SetTexture("_BumpMap", n); m.EnableKeyword("_NORMALMAP"); }
            if (d == null)
            {
                // Strand-modelled brows and lashes and untextured hair ship without a texture: a dark fibre colour.
                m.SetColor("_BaseColor", kind == "eyes" ? new Color(0.35f, 0.22f, 0.12f) : new Color(0.09f, 0.06f, 0.045f));
            }
            switch (kind)
            {
                case "skin":
                    m.SetFloat("_Smoothness", 0.42f); m.SetFloat("_Metallic", 0f);
                    break;
                case "eyes":
                    // The MakeHuman eye carries its cornea in the texture's alpha: clip it so the iris shows through.
                    m.SetFloat("_Smoothness", 0.9f);
                    if (d != null) { m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.5f); m.EnableKeyword("_ALPHATEST_ON"); }
                    break;
                case "cloth":
                    m.SetFloat("_Smoothness", 0.32f); m.SetFloat("_Metallic", 0f);
                    if (d != null) { m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.5f); m.EnableKeyword("_ALPHATEST_ON"); }
                    m.SetFloat("_Cull", 0f);
                    break;
                case "hair":
                case "brows":
                case "lashes":
                    if (d != null) { m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.4f); m.EnableKeyword("_ALPHATEST_ON"); }
                    m.SetFloat("_Cull", 0f);   // double-sided cards
                    m.SetFloat("_Smoothness", kind == "hair" ? 0.55f : 0.3f);
                    m.renderQueue = 2450;
                    break;
            }
            AssetDatabase.CreateAsset(m, matPath);
            return m;
        }
    }
}
