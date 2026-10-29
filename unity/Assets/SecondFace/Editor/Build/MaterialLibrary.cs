using System.Collections.Generic;
using System.IO;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Builds URP Lit materials for every surface entry of the fetched texture library into
    /// Assets/SecondFace/Generated/Materials/&lt;key&gt;.mat (generated, not committed) and hands them to kit models by
    /// material-slot name (mat_&lt;key&gt;). The bake-off's material sheet renders them side by side.
    /// </summary>
    public static class MaterialLibrary
    {
        public const string Dir = "Assets/SecondFace/Generated/Materials";

        public static string PathFor(string key) => $"{Dir}/{key}.mat";

        [MenuItem("Second Face/Build material library")]
        public static void BuildAll()
        {
            var lib = TextureLibrary.Load();
            if (lib.Count == 0) { Debug.LogWarning("MaterialLibrary: no external library (run tools/unity/assets.py)"); return; }
            Directory.CreateDirectory(Dir);
            var n = 0;
            foreach (var kv in lib) { if (Build(kv.Key, kv.Value) != null) n++; }
            AssetDatabase.SaveAssets();
            Debug.Log($"MaterialLibrary: {n} materials in {Dir}");
        }

        /// <summary>The material for a library key, building it if needed; null when the key is unknown.</summary>
        public static Material Get(string key)
        {
            // card slots are mat_card:<name>; the FBX round trip may turn the ':' into '_' (no library key starts with "card_")
            if (key.StartsWith("card:") || key.StartsWith("card_")) return Card(key.Substring(5));
            // nature slots are mat_nature:<stem>; the FBX round trip turns the ':' into '_'
            if (key.StartsWith("nature:") || key.StartsWith("nature_")) return Nature(key.Substring(7));
            var existing = AssetDatabase.LoadAssetAtPath<Material>(PathFor(key));
            if (existing != null) return existing;
            var lib = TextureLibrary.Load();
            return lib.TryGetValue(key, out var e) ? Build(key, e) : null;
        }

        /// <summary>
        /// Binds library materials to a kit instance by slot name (mat_&lt;key&gt;). Called by the builders after instantiating,
        /// never during import: Unity forbids creating assets in import callbacks and the URP shader is not loaded yet on a
        /// cold import (CI run 14). The import keeps the slot names on placeholder materials (ImportStandard, InPrefab).
        /// </summary>
        public static int Bind(GameObject root)
        {
            var n = 0;
            foreach (var r in root.GetComponentsInChildren<Renderer>(true))
            {
                var mats = r.sharedMaterials; var changed = false;
                for (var i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null) continue;
                    var name = mats[i].name;
                    var key = name.StartsWith("mat_") ? name.Substring(4) : name;
                    var m = Get(key);
                    if (m == null) { Debug.LogWarning($"{root.name}: no library material for slot {name}"); continue; }
                    mats[i] = m; changed = true; n++;
                }
                if (changed) r.sharedMaterials = mats;
            }
            return n;
        }

        /// <summary>A foliage card (Kits/Trees/tex/card_&lt;name&gt;.png, baked by tools/unity/kits/cards.py): cutout,
        /// double-sided. Re-configured on every call so this code stays the source of truth.</summary>
        public static Material Card(string name)
        {
            var path = PathFor("card_" + name);
            var d = AssetDatabase.LoadAssetAtPath<Texture2D>($"Assets/SecondFace/Kits/Trees/tex/card_{name}.png");
            if (d == null) { Debug.LogWarning($"MaterialLibrary: no card texture card_{name}.png"); return null; }
            Directory.CreateDirectory(Dir);
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "card_" + name };
            m.SetTexture("_BaseMap", d);
            m.SetColor("_BaseColor", Color.white);
            m.SetFloat("_Smoothness", 0.2f); m.SetFloat("_Metallic", 0f);
            m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.45f); m.EnableKeyword("_ALPHATEST_ON");
            m.SetFloat("_Cull", 0f);   // double-sided cards
            m.SetFloat("_ReceiveShadows", 1f);
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>
        /// A baked nature model's material (Models/Nature/tex/&lt;stem&gt;_d.jpg|png and &lt;stem&gt;_n.png, written by
        /// tools/unity/models_bake.py): URP Lit; cut-out and double-sided when the base colour carries alpha (leaves,
        /// grass), opaque otherwise (bark, rock). Re-configured on every call so this code stays the source of truth.
        /// </summary>
        public static Material Nature(string stem)
        {
            const string tex = "Assets/SecondFace/Models/Nature/tex/";
            var dPath = File.Exists($"{tex}{stem}_d.png") ? $"{tex}{stem}_d.png" : $"{tex}{stem}_d.jpg";
            var d = AssetDatabase.LoadAssetAtPath<Texture2D>(dPath);
            if (d == null) { Debug.LogWarning($"MaterialLibrary: no nature texture for {stem}"); return null; }
            var nrm = AssetDatabase.LoadAssetAtPath<Texture2D>($"{tex}{stem}_n.png");
            var cut = dPath.EndsWith(".png");   // the baker writes PNG exactly when the base colour carries alpha
            Directory.CreateDirectory(Dir);
            var path = PathFor("nature_" + stem);
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "nature_" + stem };
            m.SetTexture("_BaseMap", d);
            m.SetColor("_BaseColor", Color.white);
            m.SetFloat("_Metallic", 0f);
            m.SetFloat("_Smoothness", cut ? 0.15f : 0.2f);
            if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.SetFloat("_BumpScale", 1f); m.EnableKeyword("_NORMALMAP"); }
            else { m.SetTexture("_BumpMap", null); m.DisableKeyword("_NORMALMAP"); }
            if (cut)
            {
                m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.5f); m.EnableKeyword("_ALPHATEST_ON");
                m.SetFloat("_Cull", 0f);   // leaves and blades are single sheets
            }
            else
            {
                m.SetFloat("_AlphaClip", 0f); m.DisableKeyword("_ALPHATEST_ON");
                m.SetFloat("_Cull", 2f);
            }
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        private static Material Build(string key, LibraryEntry e)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) { Debug.LogError("URP Lit shader not found"); return null; }
            var d = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d"));
            var nrm = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n"));
            var mask = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask"));
            var h = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "h"));
            if (d == null) { Debug.LogWarning($"MaterialLibrary: {key} has no base colour at {TextureLibrary.MapPath(key, "d")}"); return null; }
            Directory.CreateDirectory(Dir);
            var m = AssetDatabase.LoadAssetAtPath<Material>(PathFor(key));
            var fresh = m == null;
            if (fresh) m = new Material(shader);
            m.SetTexture("_BaseMap", d);
            m.SetColor("_BaseColor", Color.white);
            // Tiling: the texture covers `metres` metres; kit UVs are in metres, so one tile per `metres`.
            var tile = 1f / Mathf.Max(0.01f, e.Metres);
            m.SetTextureScale("_BaseMap", new Vector2(tile, tile));
            if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.SetFloat("_BumpScale", 1f); m.EnableKeyword("_NORMALMAP"); }
            if (mask != null)
            {
                // mask: R metallic, G occlusion, B height, A smoothness — URP Lit reads metallic from R and smoothness from A
                // of the metallic map, and occlusion from G of the occlusion map.
                m.SetTexture("_MetallicGlossMap", mask);
                m.SetFloat("_Smoothness", 1f);
                m.SetFloat("_Metallic", 1f);
                m.EnableKeyword("_METALLICSPECGLOSSMAP");
                m.SetTexture("_OcclusionMap", mask);
                m.SetFloat("_OcclusionStrength", 1f);
                m.EnableKeyword("_OCCLUSIONMAP");
            }
            if (h != null && e.Use == "surface")
            {
                m.SetTexture("_ParallaxMap", h);
                m.SetFloat("_Parallax", 0.01f);
                m.EnableKeyword("_PARALLAXMAP");
            }
            m.name = key;
            if (fresh) AssetDatabase.CreateAsset(m, PathFor(key)); else EditorUtility.SetDirty(m);
            return m;
        }
    }

    /// <summary>Kit models (Assets/SecondFace/Kits) get their library materials by slot name (mat_&lt;key&gt;) and colliders;
    /// foliage cards (card_*.png) keep their alpha.</summary>
    public sealed class KitImportPostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 5;

        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/SecondFace/Kits/") || !System.IO.Path.GetFileName(assetPath).StartsWith("card_")) return;
            var imp = (TextureImporter)assetImporter;
            // The generated metas say "no alpha" (a template made for terrain textures); a card is its alpha.
            imp.alphaSource = TextureImporterAlphaSource.FromInput;
            imp.alphaIsTransparency = true;
        }

        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith("Assets/SecondFace/Kits/")) return;
            var imp = (ModelImporter)assetImporter;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            // Blender's Z-up becomes a 270° root rotation unless baked into the mesh; builders set the root rotation and
            // would overwrite it, laying walls flat (seen in the first engine captures).
            imp.bakeAxisConversion = true;
            imp.addCollider = true;
            imp.isReadable = false;
            imp.importAnimation = false;
            imp.importBlendShapes = false;
            imp.meshCompression = ModelImporterMeshCompression.Off;   // compression only shrinks files and can add artifacts
            imp.generateSecondaryUV = true;
            if (assetPath.StartsWith("Assets/SecondFace/Kits/Trees/"))
            {
                // Card trees are scattered by the hundred: no colliders, no lightmap UVs, and the baker's bent card normals
                // (the crown shades as a volume) kept as written.
                imp.addCollider = false;
                imp.generateSecondaryUV = false;
                imp.importNormals = ModelImporterNormals.Import;
            }
        }

        /// <summary>Card trees carry meshes named &lt;tree&gt;_LOD0/1/2 (tools/unity/kits/trees.py), from which the import
        /// builds a LODGroup; its switch heights are set here: the full tree while it fills more than about a fifth of the
        /// screen's height, the trunk with half the cards down to a fourteenth, the crossed impostor down to a hundredth.</summary>
        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.StartsWith("Assets/SecondFace/Kits/Trees/")) return;
            var group = root.GetComponent<LODGroup>();
            if (group == null) { Debug.LogWarning($"{assetPath}: no LODGroup (the meshes must be named _LOD0, _LOD1, _LOD2)"); return; }
            var lods = group.GetLODs();
            float[] at = { 0.22f, 0.07f, 0.01f };
            for (var i = 0; i < lods.Length && i < at.Length; i++) lods[i].screenRelativeTransitionHeight = at[i];
            group.SetLODs(lods);
            group.RecalculateBounds();
        }

    }
}
