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
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 8;

        private bool IsPerson => assetPath.StartsWith("Assets/SecondFace/People/");

        private void OnPreprocessModel()
        {
            if (!IsPerson) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            // Map the bones afresh on every import: the .meta keeps the mapping of the first import, and when the rig
            // changed (the jaw was merged into the head) the stale map failed every avatar ("Transform 'Jaw' for human
            // bone 'Jaw' not found").
            imp.humanDescription = new HumanDescription();
            imp.autoGenerateAvatarMappingIfUnspecified = true;
            imp.importBlendShapes = true;
            imp.importBlendShapeNormals = ModelImporterNormals.None;
            // Blender's own smooth normals: Unity's recalculation bent the normals in the eye's recessed pupil, which then
            // caught the sky at a grazing angle and rendered as a grey diamond (2026-10-28).
            imp.importNormals = ModelImporterNormals.Import;
            imp.isReadable = false;
            imp.meshCompression = ModelImporterMeshCompression.Off;
            // people are never lightmapped, and uv1 carries the wardrobe's base indices (the player's skin mask): the meta
            // template's lightmap unwrap wrote over it (P4 step 3)
            imp.generateSecondaryUV = false;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            imp.optimizeGameObjects = false;
        }

        /// <summary>The levels of detail mh_build exports (objects named _LOD0.._LOD2, which the importer groups into a
        /// LODGroup) switch by the person's share of the screen's height: LOD0 for close-ups (conversation, portraits,
        /// above 45 %), LOD1 for the game camera's person (13-44 % at 8-26 m), LOD2 far, culled under 1.2 %.</summary>
        public static readonly float[] LodHeights = { 0.45f, 0.1f, 0.012f };

        private void OnPostprocessModel(GameObject root)
        {
            if (!IsPerson || !root.TryGetComponent<LODGroup>(out var group)) return;
            var lods = group.GetLODs();
            for (var i = 0; i < lods.Length && i < LodHeights.Length; i++) lods[i].screenRelativeTransitionHeight = LodHeights[i];
            group.SetLODs(lods);
        }

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/SecondFace/People/")) return;
            var imp = (TextureImporter)assetImporter;
            var name = Path.GetFileNameWithoutExtension(assetPath);
            var normal = name.EndsWith("_n");
            imp.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            imp.sRGBTexture = !normal;
            // The generated metas say "no alpha" (a template made for terrain textures), which threw away the hair cards'
            // cut-outs and the skin's smoothness: the alpha is read from the file. A person's own skin carries smoothness
            // in its alpha (mh_build bake_skin), not transparency.
            imp.alphaSource = normal ? TextureImporterAlphaSource.None : TextureImporterAlphaSource.FromInput;
            imp.alphaIsTransparency = !normal && !name.Contains("__skin_");
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

        /// <summary>The material for a slot name (mat_&lt;kind&gt;:&lt;texture&gt;) in &lt;modelDir&gt;/Materials, created once
        /// and re-configured on every call, so this code stays the source of truth for an existing material.</summary>
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
            // the player's skin hides under worn garments (SecondFace/Skin, the wardrobe's mask); everyone else is URP Lit
            var wardrobeSkin = kind == "skin" && dir.EndsWith("/Player");
            var shader = Shader.Find(wardrobeSkin ? "SecondFace/Skin" : "Universal Render Pipeline/Lit");
            if (shader == null) { Debug.LogError($"PeopleMaterials: shader for {kind} not found"); return null; }
            var m = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            var created = m == null;
            if (created) m = new Material(shader) { name = $"{kind}_{tex}" };
            else m.shader = shader;
            var d = tex == "none" ? null : AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex}.png");
            if (d != null) m.SetTexture("_BaseMap", d);
            var nrm = d == null ? null : NormalFor(dir, tex);
            if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); }
            if (d == null)
            {
                // Strand-modelled brows and lashes and untextured hair ship without a texture: a dark fibre colour.
                m.SetColor("_BaseColor", kind == "eyes" ? new Color(0.35f, 0.22f, 0.12f) : new Color(0.09f, 0.06f, 0.045f));
            }
            switch (kind)
            {
                case "skin" when wardrobeSkin:
                    m.SetFloat("_Smoothness", d != null && tex.Contains("__skin") ? 1f : 0.42f);   // × the albedo's alpha
                    break;
                case "skin":
                    m.SetFloat("_Metallic", 0f);
                    if (d != null && tex.Contains("__skin"))
                    {
                        // smoothness painted per texel (matte stubble and dirt, drier lips) in the albedo's alpha
                        m.SetFloat("_SmoothnessTextureChannel", 1f); m.EnableKeyword("_SMOOTHNESS_TEXTURE_ALBEDO_CHANNEL_A");
                        m.SetFloat("_Smoothness", 1f);
                    }
                    else
                    {
                        m.SetFloat("_SmoothnessTextureChannel", 0f); m.DisableKeyword("_SMOOTHNESS_TEXTURE_ALBEDO_CHANNEL_A");
                        m.SetFloat("_Smoothness", 0.42f);
                    }
                    break;
                case "eyes":
                    // The eyeball alone (mh_build drops the cornea shell): opaque, wet.
                    m.SetFloat("_Smoothness", 0.7f); m.SetFloat("_Metallic", 0f);
                    m.SetFloat("_AlphaClip", 0f); m.DisableKeyword("_ALPHATEST_ON");
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
                    // Hair rule: dull, dusty, never glossy: no sky in it either (cards at a grazing angle caught the sky's
                    // reflection as a blue-grey sheen, P4 step 7)
                    m.SetFloat("_Smoothness", kind == "hair" ? 0.25f : 0.3f);
                    m.SetFloat("_EnvironmentReflections", 0f); m.EnableKeyword("_ENVIRONMENTREFLECTIONS_OFF");
                    m.SetFloat("_SpecularHighlights", 0f); m.EnableKeyword("_SPECULARHIGHLIGHTS_OFF");
                    m.renderQueue = 2450;
                    break;
            }
            if (created) AssetDatabase.CreateAsset(m, matPath); else EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>The normal map for a diffuse named &lt;stem&gt;_d: &lt;stem&gt;_n, or for a person's dyed garment
        /// (&lt;id&gt;__&lt;garment&gt;_d) the garment's shared &lt;garment&gt;_n. Only the suffix is replaced: an id such as
        /// p3_drifter_m contains "_d" too.</summary>
        private static Texture2D NormalFor(string dir, string tex)
        {
            if (!tex.EndsWith("_d")) return null;
            var stem = tex.Substring(0, tex.Length - 2);
            var own = AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{stem}_n.png");
            if (own != null) return own;
            var split = stem.IndexOf("__", System.StringComparison.Ordinal);
            return split < 0 ? null : AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{stem.Substring(split + 2)}_n.png");
        }
    }
}
