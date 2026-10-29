using System.Collections.Generic;
using System.Text;
using SecondFace.Game.UI;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;
using UnityEngine.TextCore.Text;
using UnityEngine.UIElements;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The interface's assets (P5 step 3): <see cref="UIAssets"/> at <see cref="AssetPath"/> with the panel settings
    /// (the theme <see cref="ThemePath"/>, scaled with the screen's height from 1280×720) and the typefaces as font
    /// assets beside their TTFs in UI/Fonts. Each face is a static SDF atlas of the Latin set (ASCII, Latin-1, Latin
    /// Extended-A, the typographic punctuation; sized to the smallest atlas that holds it), so no glyph is rasterised
    /// on the phone while playing; behind each family a dynamic fallback (emptied on build) catches anything else.
    /// Existing font assets are kept (the theme refers to them); Second Face/Rebuild UI fonts makes them again.
    /// </summary>
    public static class UIBuild
    {
        public const string Dir = "Assets/SecondFace/UI";
        public const string AssetPath = Dir + "/UIAssets.asset";
        public const string PanelPath = Dir + "/Panel.asset";
        public const string ThemePath = Dir + "/Theme/SecondFace.tss";
        public const string ThemeUssPath = Dir + "/Theme/Theme.uss";
        /// <summary>The size glyphs are sampled at and the SDF spread round them, atlas pixels.</summary>
        public const int Sampling = 56, Padding = 6;

        [MenuItem("Second Face/Build UI assets")]
        public static UIAssets Build() => Build(false);

        [MenuItem("Second Face/Rebuild UI fonts")]
        public static void RebuildFonts() => Build(true);

        public static UIAssets Build(bool rebuildFonts)
        {
            var barlow = Dynamic("Barlow-Regular", rebuildFonts);
            var literata = Dynamic("Literata-Regular", rebuildFonts);
            var interfaceFace = Static("Barlow-Regular", barlow, rebuildFonts);
            var interfaceStrong = Static("Barlow-SemiBold", barlow, rebuildFonts);
            var book = Static("Literata-Regular", literata, rebuildFonts);
            var bookItalic = Static("Literata-Italic", literata, rebuildFonts);
            var bookHeading = Static("Literata-SemiBold", literata, rebuildFonts);
            AssetDatabase.SaveAssets();
            // the theme's url()s are resolved to the font assets when it imports
            if (rebuildFonts) AssetDatabase.ImportAsset(ThemeUssPath, ImportAssetOptions.ForceUpdate);

            var a = AssetDatabase.LoadAssetAtPath<UIAssets>(AssetPath);
            var fresh = a == null;
            if (fresh) a = ScriptableObject.CreateInstance<UIAssets>();
            a.Panel = Panel();
            a.Interface = interfaceFace;
            a.InterfaceStrong = interfaceStrong;
            a.Book = book;
            a.BookItalic = bookItalic;
            a.BookHeading = bookHeading;
            if (fresh) AssetDatabase.CreateAsset(a, AssetPath);
            else EditorUtility.SetDirty(a);
            AssetDatabase.SaveAssets();
            if (!a.Complete) Debug.LogWarning("UIBuild: some of the interface's assets are missing (fonts, theme)");
            else Debug.Log($"UIBuild: {AssetPath} built");
            return a;
        }

        private static PanelSettings Panel()
        {
            var p = AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelPath);
            var fresh = p == null;
            if (fresh) p = ScriptableObject.CreateInstance<PanelSettings>();
            p.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath);
            p.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            p.referenceResolution = new Vector2Int(1280, 720);
            p.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;
            p.match = 1f;   // by height: every landscape phone shows the same layout, a wider one has more room at the sides
            p.sortingOrder = 0;
            p.clearColor = false;
            if (fresh) AssetDatabase.CreateAsset(p, PanelPath);
            else EditorUtility.SetDirty(p);
            return p;
        }

        /// <summary>The characters every face carries in its static atlas.</summary>
        public static string Charset()
        {
            var s = new StringBuilder();
            for (var c = 0x20; c <= 0x7E; c++) s.Append((char)c);
            for (var c = 0xA0; c <= 0x17F; c++) s.Append((char)c);   // Latin-1 and Latin Extended-A
            // dashes, quotes, dagger, bullet, ellipsis, per mille, primes, angle quotes, fraction slash, euro, numero,
            // arrows, minus, approx, not equal, less/greater or equal, circles
            foreach (var c in "‐‑‒–—―‘’‚“”„†‡•…‰′″‹›⁄€№←↑→↓−≈≠≤≥○●")
                s.Append(c);
            return s.ToString();
        }

        /// <summary>The characters of <see cref="Charset"/> the font has a glyph for.</summary>
        private static string Supported(Font font)
        {
            if (FontEngine.LoadFontFace(font, Sampling) != FontEngineError.Success) return Charset();
            var s = new StringBuilder();
            foreach (var c in Charset())
                if (FontEngine.TryGetGlyphIndex(c, out var index) && index != 0) s.Append(c);
            return s.ToString();
        }

        private static FontAsset Static(string face, FontAsset fallback, bool rebuild)
        {
            var path = $"{Dir}/Fonts/{face}.asset";
            var existing = AssetDatabase.LoadAssetAtPath<FontAsset>(path);
            if (existing != null && !rebuild) return existing;
            var font = AssetDatabase.LoadAssetAtPath<Font>($"{Dir}/Fonts/{face}.ttf");
            if (font == null) { Debug.LogError($"UIBuild: no {Dir}/Fonts/{face}.ttf"); return existing; }
            var wanted = Supported(font);
            FontAsset fa = null;
            foreach (var (w, h) in new[] { (512, 512), (1024, 512), (1024, 1024), (2048, 1024) })
            {
                fa = FontAsset.CreateFontAsset(font, Sampling, Padding, GlyphRenderMode.SDF16, w, h, AtlasPopulationMode.Dynamic, false);
                if (fa.TryAddCharacters(wanted, out var missing)) break;
                Debug.Log($"UIBuild: {face}: {missing?.Length ?? 0} of {wanted.Length} glyphs do not fit {w}×{h}");
                Discard(fa);
                fa = null;
            }
            if (fa == null) { Debug.LogError($"UIBuild: {face} does not fit a 2048×1024 atlas"); return existing; }
            fa.atlasPopulationMode = AtlasPopulationMode.Static;
            fa.name = face;
            if (fallback != null) fa.fallbackFontAssetTable = new List<FontAsset> { fallback };
            Save(fa, path, existing != null);
            var fso = new SerializedObject(fa);   // a static atlas is kept whole in the build
            var clear = fso.FindProperty("m_ClearDynamicDataOnBuild");
            if (clear != null) { clear.boolValue = false; fso.ApplyModifiedPropertiesWithoutUndo(); }
            foreach (var t in fa.atlasTextures)
            {
                // a static atlas is never written again: no CPU copy on the phone
                var so = new SerializedObject(t);
                var readable = so.FindProperty("m_IsReadable");
                if (readable != null) { readable.boolValue = false; so.ApplyModifiedPropertiesWithoutUndo(); }
            }
            Debug.Log($"UIBuild: {face}: {fa.characterTable.Count} characters in {fa.atlasWidth}×{fa.atlasHeight}");
            return fa;
        }

        /// <summary>A family's dynamic fallback: rasterises on demand what the static atlases lack (emptied on build).</summary>
        private static FontAsset Dynamic(string face, bool rebuild)
        {
            var path = $"{Dir}/Fonts/{face} Fallback.asset";
            var existing = AssetDatabase.LoadAssetAtPath<FontAsset>(path);
            if (existing != null && !rebuild) return existing;
            var font = AssetDatabase.LoadAssetAtPath<Font>($"{Dir}/Fonts/{face}.ttf");
            if (font == null) { Debug.LogError($"UIBuild: no {Dir}/Fonts/{face}.ttf"); return existing; }
            var fa = FontAsset.CreateFontAsset(font, Sampling, Padding, GlyphRenderMode.SDFAA, 512, 512, AtlasPopulationMode.Dynamic, true);
            fa.name = face + " Fallback";
            Save(fa, path, existing != null);
            var so = new SerializedObject(fa);   // clearDynamicDataOnBuild is internal
            var clear = so.FindProperty("m_ClearDynamicDataOnBuild");
            if (clear != null) { clear.boolValue = true; so.ApplyModifiedPropertiesWithoutUndo(); }
            return fa;
        }

        private static void Save(FontAsset fa, string path, bool replace)
        {
            if (replace) AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(fa, path);
            var i = 0;
            foreach (var t in fa.atlasTextures)
            {
                if (t == null) continue;
                t.name = $"{fa.name} Atlas{(i++ > 0 ? " " + i : "")}";
                AssetDatabase.AddObjectToAsset(t, fa);
            }
            if (fa.material != null)
            {
                fa.material.name = fa.name + " Material";
                AssetDatabase.AddObjectToAsset(fa.material, fa);
            }
            EditorUtility.SetDirty(fa);
        }

        private static void Discard(FontAsset fa)
        {
            foreach (var t in fa.atlasTextures) if (t != null) Object.DestroyImmediate(t);
            if (fa.material != null) Object.DestroyImmediate(fa.material);
            Object.DestroyImmediate(fa);
        }
    }
}
