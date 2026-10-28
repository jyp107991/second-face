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
            if (key.StartsWith("card:")) return Card(key.Substring(5));
            var existing = AssetDatabase.LoadAssetAtPath<Material>(PathFor(key));
            if (existing != null) return existing;
            var lib = TextureLibrary.Load();
            return lib.TryGetValue(key, out var e) ? Build(key, e) : null;
        }

        /// <summary>A foliage card (Kits/Trees/tex/card_&lt;name&gt;.png, baked by tools/unity/kits/cards.py): cutout, double-sided.</summary>
        public static Material Card(string name)
        {
            var path = PathFor("card_" + name);
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null) return existing;
            var d = AssetDatabase.LoadAssetAtPath<Texture2D>($"Assets/SecondFace/Kits/Trees/tex/card_{name}.png");
            if (d == null) { Debug.LogWarning($"MaterialLibrary: no card texture card_{name}.png"); return null; }
            Directory.CreateDirectory(Dir);
            var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = "card_" + name };
            m.SetTexture("_BaseMap", d);
            m.SetColor("_BaseColor", Color.white);
            m.SetFloat("_Smoothness", 0.2f); m.SetFloat("_Metallic", 0f);
            m.SetFloat("_AlphaClip", 1f); m.SetFloat("_Cutoff", 0.45f); m.EnableKeyword("_ALPHATEST_ON");
            m.SetFloat("_Cull", 0f);   // double-sided cards
            m.SetFloat("_ReceiveShadows", 1f);
            AssetDatabase.CreateAsset(m, path);
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

    /// <summary>Kit models (Assets/SecondFace/Kits) get their library materials by slot name (mat_&lt;key&gt;) and colliders.</summary>
    public sealed class KitImportPostprocessor : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.StartsWith("Assets/SecondFace/Kits/")) return;
            var imp = (ModelImporter)assetImporter;
            imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            imp.addCollider = true;
            imp.isReadable = false;
            imp.importAnimation = false;
            imp.importBlendShapes = false;
            imp.meshCompression = ModelImporterMeshCompression.Medium;
            imp.generateSecondaryUV = true;
        }

        private Material OnAssignMaterialModel(Material material, Renderer renderer)
        {
            if (!assetPath.StartsWith("Assets/SecondFace/Kits/")) return null;
            var name = material.name;
            var key = name.StartsWith("mat_") ? name.Substring(4) : name;
            var m = MaterialLibrary.Get(key);
            if (m == null) Debug.LogWarning($"{assetPath}: no library material for slot {name}");
            return m;
        }
    }
}
