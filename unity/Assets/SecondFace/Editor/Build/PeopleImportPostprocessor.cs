using System.IO;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// People models (Assets/SecondFace/People) import as Humanoid with blend shapes. Their material slots name their
    /// textures (mat_skin:&lt;file&gt;, mat_hair:&lt;file&gt;, mat_brows:, mat_lashes:, mat_eyes:, mat_cloth:) which live
    /// beside the model in tex/; the import keeps those names on placeholder materials and <see cref="PeopleMaterials"/>
    /// binds the real ones when a person is instantiated (materials are never created inside an import callback:
    /// Unity forbids it, and the URP shader is not even loaded yet on a cold import).
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
    }

    /// <summary>Builds and binds a person's materials from its slot names; called by the scene builders after instantiating.</summary>
    public static class PeopleMaterials
    {
        private static readonly string[] Kinds = { "skin", "eyes", "hair", "brows", "lashes", "cloth" };

        /// <summary>Replaces the placeholder materials of every renderer under <paramref name="root"/>. Returns the slots bound.</summary>
        public static int Bind(GameObject root, string modelDir)
        {
            var n = 0;
            foreach (var r in root.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials; var changed = false;
                for (var i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null) continue;
                    var m = Build(mats[i].name, modelDir);
                    if (m == null) continue;
                    mats[i] = m; changed = true; n++;
                }
                if (changed) r.sharedMaterials = mats;
            }
            return n;
        }

        /// <summary>The material for a slot name (mat_&lt;kind&gt;:&lt;texture&gt;), built once into &lt;modelDir&gt;/Materials.</summary>
        public static Material Build(string slotName, string modelDir)
        {
            var name = slotName.StartsWith("mat_") ? slotName.Substring(4) : slotName;
            // Slots are written mat_<kind>:<texture>; the FBX round trip turns the ':' into '_' (seen in the editor), so
            // the kind is matched as a known prefix followed by either separator.
            string kind = null, tex = null;
            foreach (var k in Kinds)
            {
                if (name.Length > k.Length + 1 && name.StartsWith(k) && (name[k.Length] == ':' || name[k.Length] == '_'))
                { kind = k; tex = name.Substring(k.Length + 1); break; }
            }
            if (kind == null) return null;
            var dir = modelDir.Replace('\\', '/').TrimEnd('/');
            var matDir = dir + "/Materials";
            Directory.CreateDirectory(matDir);
            var matPath = $"{matDir}/{kind}_{tex}.mat";
            var existing = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (existing != null) return existing;
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) { Debug.LogError("PeopleMaterials: URP Lit shader not found"); return null; }
            var m = new Material(shader) { name = $"{kind}_{tex}" };
            var d = tex == "none" ? null : AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex}.png");
            if (d != null) m.SetTexture("_BaseMap", d);
            var nrm = AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex.Replace("_d", "_n")}.png");
            if (nrm != null && tex.EndsWith("_d")) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); }
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
                    // Hair rule: dull, dusty, never glossy.
                    m.SetFloat("_Smoothness", kind == "hair" ? 0.25f : 0.3f);
                    m.renderQueue = 2450;
                    break;
            }
            AssetDatabase.CreateAsset(m, matPath);
            return m;
        }
    }
}
