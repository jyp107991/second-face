using System.IO;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The sky's assets (Assets/SecondFace/Sky): the sky material on SecondFace/Sky, two soft particle textures drawn here
    /// (a dot and a streak), their materials on SecondFace/Weather Particle and the <see cref="SkyProfile"/> that names
    /// them. Committed so scenes refer to them by GUID; rebuilt by this code in place.
    /// </summary>
    public static class SkyAssets
    {
        public const string Dir = "Assets/SecondFace/Sky";
        public const string ProfilePath = Dir + "/SkyProfile.asset";

        [MenuItem("Second Face/Build sky assets")]
        public static SkyProfile Build()
        {
            Directory.CreateDirectory(Dir);
            var dot = Texture("dot", 64, 64, (u, v) => { var r = Mathf.Sqrt(u * u + v * v); return Mathf.Clamp01(1 - r) * Mathf.Clamp01(1 - r); });
            var streak = Texture("streak", 16, 64, (u, v) => Mathf.Clamp01(1 - Mathf.Abs(u)) * Mathf.Clamp01(1 - v * v));
            var profile = AssetDatabase.LoadAssetAtPath<SkyProfile>(ProfilePath);
            var fresh = profile == null;
            if (fresh) profile = ScriptableObject.CreateInstance<SkyProfile>();
            profile.Sky = Mat("Sky", "SecondFace/Sky", null);
            profile.Dot = Mat("Dot", "SecondFace/Weather Particle", dot);
            profile.Streak = Mat("Streak", "SecondFace/Weather Particle", streak);
            if (fresh) AssetDatabase.CreateAsset(profile, ProfilePath); else EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            Debug.Log($"SkyAssets: {ProfilePath}");
            return profile;
        }

        private static Material Mat(string name, string shaderName, Texture2D tex)
        {
            var shader = Shader.Find(shaderName);
            if (shader == null) { Debug.LogError($"SkyAssets: {shaderName} is missing (Assets/SecondFace/Shaders)"); return null; }
            var path = $"{Dir}/{name}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null) { mat = new Material(shader) { name = name }; AssetDatabase.CreateAsset(mat, path); }
            if (mat.shader != shader) mat.shader = shader;
            if (tex != null) mat.SetTexture("_MainTex", tex);
            EditorUtility.SetDirty(mat);
            return mat;
        }

        /// <summary>A white texture whose alpha is <paramref name="alpha"/>(u, v) over u, v in -1..1, saved as PNG.</summary>
        private static Texture2D Texture(string name, int w, int h, System.Func<float, float, float> alpha)
        {
            var path = $"{Dir}/{name}.png";
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            for (var y = 0; y < h; y++)
                for (var x = 0; x < w; x++)
                    t.SetPixel(x, y, new Color(1, 1, 1, alpha((x + 0.5f) / w * 2 - 1, (y + 0.5f) / h * 2 - 1)));
            File.WriteAllBytes(path, t.EncodeToPNG());
            Object.DestroyImmediate(t);
            AssetDatabase.ImportAsset(path);
            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            importer.alphaIsTransparency = true;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.mipmapEnabled = true;
            importer.SaveAndReimport();
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }
    }
}
