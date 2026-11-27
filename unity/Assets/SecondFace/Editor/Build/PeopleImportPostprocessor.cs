using System.IO;
using System.Linq;
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
        public override uint GetVersion() => 10;

        private bool IsPerson => assetPath.StartsWith("Assets/SecondFace/People/");

        private void OnPreprocessModel()
        {
            if (!IsPerson) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            // Map the bones afresh whenever the file changes: the .meta keeps the mapping of the first import, and when the rig
            // changed (the jaw was merged into the head) the stale map failed every avatar ("Transform 'Jaw' for human
            // bone 'Jaw' not found"). A file whose configuration was stood on its root for these bytes (Ground) keeps it.
            // A new HumanDescription zeroes the muscle settings (twist 0, stretch 0); Unity's defaults put half of each
            // limb's roll in each of its joints and let the limbs stretch a little to reach (P4.8).
            var stamp = Groundable(assetPath) ? Stamp(assetPath) : "";
            if (stamp == "" || imp.userData != "ground " + stamp || imp.humanDescription.human == null || imp.humanDescription.human.Length == 0)
            {
                imp.humanDescription = new HumanDescription
                {
                    upperArmTwist = 0.5f, lowerArmTwist = 0.5f, upperLegTwist = 0.5f, lowerLegTwist = 0.5f,
                    armStretch = 0.05f, legStretch = 0.05f, feetSpacing = 0f, hasTranslationDoF = false,
                };
                // (a model that is not a person's body, a garment's or a hair's rig, is mapped afresh every time, as before)
                if (stamp != "" && imp.userData != "unmapped " + stamp)
                {
                    imp.userData = "fresh " + stamp;
                    var path = assetPath;
                    EditorApplication.delayCall += () => Ground(path);
                }
            }
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

        /// <summary>The bodies clips are played on: the cast's (Rocketbox) and the player's base models.</summary>
        public static bool Groundable(string path) =>
            path.StartsWith("Assets/SecondFace/People/Rocketbox/") || path == "Assets/SecondFace/People/Player/player_m.fbx" || path == "Assets/SecondFace/People/Player/player_f.fbx";

        private static string Stamp(string path)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return System.BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-", "").ToLowerInvariant();
        }

        /// <summary>
        /// The person's configured T-pose stood on the model's root, as the model's own bind stands (docs/MOTION_ROOT_CAUSE.md
        /// §9, 2026-11-18). Unity's own avatar setup put the Rocketbox bodies' T-pose 2.69 cm (men) and 2.78 cm (women) over
        /// their bind: the T-pose ankle 12.85 cm over the root against the bind's 10.16. Unity reads that ankle height as the
        /// feet-bottom height and the T-pose's centre of mass over the root as the humanScale, so every clip played every body
        /// 2.6 cm over the floor (the idles' soles +2.0-2.6 cm, the fight's stances 2.5-4 cm) and its normalised heights against
        /// a stature 2.6 % too tall. The configuration's hips are lowered by the difference (the mean of the two ankles); the
        /// bones' turns are left as Unity set them. Runs after an import that mapped the bones afresh (from the editor's next
        /// update, or <see cref="GroundAll"/> in a batch run), then imports again with the stamp that keeps it.
        /// </summary>
        public static bool Ground(string path)
        {
            var imp = AssetImporter.GetAtPath(path) as ModelImporter;
            if (imp == null || !File.Exists(path) || !Groundable(path)) return false;
            var stamp = Stamp(path);
            if (imp.userData == "ground " + stamp || imp.userData == "unmapped " + stamp) return false;
            // (an import from before 2026-11-18 mapped the bones afresh every time: what it stored is a fresh mapping)
            if (imp.userData != "fresh " + stamp && !string.IsNullOrEmpty(imp.userData)) { imp.SaveAndReimport(); return Ground(path); }
            var hd = imp.humanDescription;
            var bone = hd.human?.ToDictionary(h => h.humanName, h => h.boneName) ?? new System.Collections.Generic.Dictionary<string, string>();
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
            if (model == null || avatar == null || !avatar.isValid || hd.skeleton == null || hd.skeleton.Length < 2
                || !bone.ContainsKey("Hips") || !bone.ContainsKey("LeftFoot") || !bone.ContainsKey("RightFoot"))
            {
                imp.userData = "unmapped " + stamp; imp.SaveAndReimport(); return false;
            }
            var w = TakeStance.World(hd.skeleton, model);
            var all = model.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
            float Bind(string b) => model.transform.InverseTransformPoint(all[bone[b]].position).y;
            var dz = (Bind("LeftFoot") + Bind("RightFoot")) * 0.5f - (w[bone["LeftFoot"]].p.y + w[bone["RightFoot"]].p.y) * 0.5f;
            var sk = hd.skeleton.ToArray();
            var hipsParent = TakeStance.ParentOf(model, bone["Hips"], sk);
            for (var i = 0; i < sk.Length; i++)
                if (sk[i].name == bone["Hips"]) sk[i].position += Quaternion.Inverse(w[hipsParent].r) * new Vector3(0f, dz, 0f);
            // (the getter gives the skeleton in metres, the setter stores what it is given in the file's units: the Rocketbox
            // FBX are in centimetres, and set back as read the configuration came in 100 times too large, its feet-bottom
            // height 10.16 m, 2026-11-18; so the positions go in scaled by the file's own scale)
            var k = imp.useFileScale && imp.fileScale > 0f ? imp.fileScale : 1f;
            for (var i = 0; i < sk.Length; i++) sk[i].position *= k;
            hd.skeleton = sk;
            imp.humanDescription = hd;
            imp.userData = "ground " + stamp;
            imp.SaveAndReimport();
            // what Unity built from it: the feet-bottom height is the bind's ankles
            var go = Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
            try
            {
                var a = go.GetComponent<Animator>();
                a.avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault(); a.Rebind();
                var want = (Bind("LeftFoot") + Bind("RightFoot")) * 0.5f; var got = (a.leftFeetBottomHeight + a.rightFeetBottomHeight) * 0.5f;
                if (Mathf.Abs(got - want) > 0.001f) Debug.LogError($"PeopleImportPostprocessor: {path}: grounded, yet the feet-bottom height is {got * 100f:0.00} cm against the bind's ankles {want * 100f:0.00}");
                else Debug.Log($"PeopleImportPostprocessor: {path}: the configured T-pose stood on the root, hips {dz * 100f:+0.00;-0.00} cm, feet-bottom {got * 100f:0.00} cm, humanScale {a.humanScale:0.0000}");
            }
            finally { Object.DestroyImmediate(go); }
            return true;
        }

        /// <summary>Every person's model whose configuration is not yet stood on its root (a batch run's first step: the
        /// editor's delayed calls do not run before -executeMethod or the tests).</summary>
        public static int GroundAll() =>
            Directory.GetFiles("Assets/SecondFace/People/", "*.fbx", SearchOption.AllDirectories).Select(p => p.Replace('\\', '/')).Where(Groundable).Count(Ground);

        /// <summary>The levels of detail mh_build exports (objects named _LOD0.._LOD2, which the importer groups into a
        /// LODGroup) switch by the person's share of the screen's height: LOD0 for close-ups (conversation, portraits,
        /// above 45 %), LOD1 for the game camera's person (13-44 % at 8-26 m), LOD2 far, culled under 1.2 %.</summary>
        public static readonly float[] LodHeights = { 0.45f, 0.1f, 0.012f };

        private void OnPostprocessModel(GameObject root)
        {
            if (!IsPerson || !root.TryGetComponent<LODGroup>(out var group)) return;
            // The brows are painted into the skin (mh_build, P4.9): the strand brows over them, thinned to the LOD budget,
            // drew as black dots at portrait size and are dropped from every level
            var strands = root.GetComponentsInChildren<Renderer>(true).Where(r => r.name.StartsWith("Brows_")).ToList();
            var lods = group.GetLODs();
            for (var i = 0; i < lods.Length; i++)
            {
                if (i < LodHeights.Length) lods[i].screenRelativeTransitionHeight = LodHeights[i];
                lods[i].renderers = lods[i].renderers.Where(r => r != null && !strands.Contains(r)).ToArray();
            }
            group.SetLODs(lods);
            foreach (var r in strands) Object.DestroyImmediate(r.gameObject);
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
            // the cast's wardrobe (P4.13): one texture a garment, shared by every body that wears it; seen at the game
            // camera's distance and in conversation, a 1K weave and a half-K normal are enough on the phone
            var garment = assetPath.Contains("/People/Player/tex/") && !name.StartsWith("player_") && !name.StartsWith("eye_");
            var android = imp.GetPlatformTextureSettings("Android");
            android.overridden = true; android.maxTextureSize = garment ? (normal ? 512 : 1024) : 2048; android.format = TextureImporterFormat.ASTC_6x6;
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
            // the player's skin hides under worn garments (SecondFace/Skin, the wardrobe's mask) and the player's garments
            // stand off each other in layers and take the content's grime (SecondFace/Cloth, P4.10); everyone else is URP Lit
            var wardrobeSkin = kind == "skin" && dir.EndsWith("/Player");
            // (the player's hair and eyes too: recoloured at creation, P5.3i)
            var wardrobeCloth = (kind == "cloth" || kind == "hair" || kind == "eyes") && dir.EndsWith("/Player");
            var shader = Shader.Find(wardrobeSkin ? "SecondFace/Skin" : wardrobeCloth ? "SecondFace/Cloth" : "Universal Render Pipeline/Lit");
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
                    // the same skin older, for the photograph (mh_build's <id>__skin_aged_d; FaceSculpt.Aged blends to it)
                    var aged = tex.EndsWith("__skin_d") ? AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/tex/{tex.Substring(0, tex.Length - 2)}_aged_d.png") : null;
                    m.SetTexture("_AgedMap", aged);
                    // P4.15c: light scattered under the skin by a lookup, and pores over the bake
                    var lut = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/SecondFace/Shaders/Skin/skin_lut.png");
                    var pores = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/SecondFace/Shaders/Skin/skin_pores_n.png");
                    m.SetTexture("_SkinLut", lut);
                    m.SetFloat("_Sss", lut != null ? 1f : 0f);
                    if (pores != null) m.SetTexture("_PoreMap", pores);
                    // the sharper lobe's peak is ~10x the broad one's: at 0.15 a forehead shone like oil, not weathered skin
                    m.SetFloat("_SharpLobe", 0.04f);
                    m.SetFloat("_PoreScale", 0.5f);
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
                    if (wardrobeCloth)
                    {
                        // the iris recoloured at creation (SecondFace/Cloth with _RecolourIris): its mean light here
                        m.SetFloat("_Cutoff", 0f); m.SetFloat("_Cull", 2f); m.SetFloat("_RecolourIris", 1f);
                        if (d != null) m.SetFloat("_RecolourLum", MeanLum($"{dir}/tex/{tex}.png", iris: true));
                    }
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
                    if (wardrobeCloth)
                    {
                        // the player's hair, recoloured at creation (SecondFace/Cloth): its mean light here
                        m.SetFloat("_EnvironmentReflectionsOff", 1f); m.SetFloat("_SpecularHighlightsOff", 1f);
                        // P4.15c: no gloss, but the soft band of light along the strands that dry hair still has
                        if (kind == "hair") m.SetFloat("_HairSheen", 1f);
                        if (d != null) m.SetFloat("_RecolourLum", MeanLum($"{dir}/tex/{tex}.png", iris: false));
                    }
                    m.renderQueue = 2450;
                    break;
            }
            if (created) AssetDatabase.CreateAsset(m, matPath); else EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>The mean linear luminance of a texture's opaque texels (of its saturated, dark ones for an iris): what
        /// SecondFace/Cloth's recolour divides by, so a chosen colour keeps the texture's light and dark round it.</summary>
        public static float MeanLum(string png, bool iris)
        {
            if (!File.Exists(png)) return 0.2f;
            var t = new Texture2D(2, 2, TextureFormat.RGBA32, false, false);
            t.LoadImage(File.ReadAllBytes(png));
            var px = t.GetPixels32();
            Object.DestroyImmediate(t);
            double sum = 0; var n = 0;
            for (var i = 0; i < px.Length; i += 7)
            {
                var p = px[i];
                if (p.a < 128) continue;
                var c = new Color(p.r / 255f, p.g / 255f, p.b / 255f).linear;
                var lum = 0.3f * c.r + 0.59f * c.g + 0.11f * c.b;
                if (iris)
                {
                    var mx = Mathf.Max(c.r, Mathf.Max(c.g, c.b)); var mn = Mathf.Min(c.r, Mathf.Min(c.g, c.b));
                    if (mx < 1e-3f || (mx - mn) / mx < 0.45f || lum > 0.3f) continue;
                }
                sum += lum; n++;
            }
            return n > 0 ? Mathf.Max(0.005f, (float)(sum / n)) : 0.2f;
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
