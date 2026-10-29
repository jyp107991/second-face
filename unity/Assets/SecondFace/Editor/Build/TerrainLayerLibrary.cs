using System.IO;
using System.Linq;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The world's terrain layers (Assets/SecondFace/Terrain/Layers/&lt;key&gt;.terrainlayer, one per texture library key
    /// a biome palette names in Core's TerrainPaint.Palettes), the terrain material (our SecondFace/Terrain/Lit: URP's
    /// terrain with anti-tiling and macro variation, height blending on) and the layer set that names them by key.
    /// Committed, like the library materials, so the world can refer to them by GUID; rebuilt by this code in place.
    /// </summary>
    public static class TerrainLayerLibrary
    {
        public const string Dir = "Assets/SecondFace/Terrain";
        public const string SetPath = Dir + "/BiomeLayers.asset";
        public const string ShaderName = "SecondFace/Terrain/Lit";
        public const string RoadShaderName = "SecondFace/Road";
        public const string WaterShaderName = "SecondFace/Water";
        public const string WaterNormalPath = Dir + "/WaterRipples.png";

        [MenuItem("Second Face/Build terrain layers")]
        public static BiomeLayerSet Build()
        {
            var lib = TextureLibrary.Load();
            if (lib.Count == 0) { Debug.LogWarning("TerrainLayerLibrary: no texture library (tools/unity/assets.py)"); return null; }
            Directory.CreateDirectory(Dir + "/Layers");
            TerrainLayer Layer(string key)
            {
                if (!lib.TryGetValue(key, out var e)) { Debug.LogWarning($"TerrainLayerLibrary: {key} is not in the library"); return null; }
                var path = $"{Dir}/Layers/{key}.terrainlayer";
                var layer = AssetDatabase.LoadAssetAtPath<TerrainLayer>(path);
                var fresh = layer == null;
                if (fresh) layer = new TerrainLayer();
                layer.diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d"));
                layer.normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n"));
                layer.maskMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask"));
                layer.tileSize = Vector2.one * e.Metres;
                layer.normalScale = 1f;
                if (fresh) AssetDatabase.CreateAsset(layer, path); else EditorUtility.SetDirty(layer);
                return layer;
            }
            var shader = Shader.Find(ShaderName);
            if (shader == null) { Debug.LogError($"TerrainLayerLibrary: {ShaderName} is missing (Assets/SecondFace/Shaders/Terrain)"); return null; }
            var matPath = Dir + "/TerrainLit.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(matPath);
            if (mat == null) { mat = new Material(shader) { name = "TerrainLit" }; AssetDatabase.CreateAsset(mat, matPath); }
            if (mat.shader != shader) mat.shader = shader;
            // height blending (the mask maps carry height in blue): stones stand out of sand instead of fading into it;
            // the shader turns it off on chunks with more than four layers, where the second pass breaks the normalisation
            mat.SetFloat("_EnableHeightBlend", 1f);
            mat.SetFloat("_HeightTransition", 0.25f);
            mat.EnableKeyword("_TERRAIN_BLEND_HEIGHT");
            mat.SetFloat("_EnableInstancedPerPixelNormal", 1f);
            EditorUtility.SetDirty(mat);
            var set = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>(SetPath);
            var freshSet = set == null;
            if (freshSet) set = ScriptableObject.CreateInstance<BiomeLayerSet>();
            set.TerrainMaterial = mat;
            set.Layers = TerrainPaint.Palettes.Values.SelectMany(k => k).Distinct().OrderBy(k => k)
                .Select(k => new BiomeLayerSet.Entry { Key = k, Layer = Layer(k) }).ToArray();
            // road surfaces (Core RoadStrips): one material each on SecondFace/Road, from the library key of the same
            // name (the trail's is "trail"); old asphalt is eaten away in patches
            var road = Shader.Find(RoadShaderName);
            if (road == null) Debug.LogError($"TerrainLayerLibrary: {RoadShaderName} is missing");
            else
            {
                Material Surface(string key, float decay)
                {
                    if (!lib.TryGetValue(key, out var e)) { Debug.LogWarning($"TerrainLayerLibrary: road surface {key} is not in the library"); return null; }
                    var path = $"{Dir}/Road_{key}.mat";
                    var m = AssetDatabase.LoadAssetAtPath<Material>(path);
                    if (m == null) { m = new Material(road) { name = $"Road_{key}" }; AssetDatabase.CreateAsset(m, path); }
                    if (m.shader != road) m.shader = road;
                    m.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d")));
                    m.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n")));
                    m.SetTexture("_MaskMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask")));
                    m.SetFloat("_Tile", e.Metres);
                    m.SetFloat("_Decay", decay);
                    EditorUtility.SetDirty(m);
                    return m;
                }
                set.Surfaces = new[]
                {
                    new BiomeLayerSet.SurfaceEntry { Key = "asphalt", Material = Surface("asphalt", 0.45f) },
                    new BiomeLayerSet.SurfaceEntry { Key = "gravel", Material = Surface("gravel", 0f) },
                    new BiomeLayerSet.SurfaceEntry { Key = "mud", Material = Surface("mud", 0f) },
                    new BiomeLayerSet.SurfaceEntry { Key = "trail", Material = Surface("trail", 0f) },
                };
            }
            set.Water = WaterMaterial();
            if (freshSet) AssetDatabase.CreateAsset(set, SetPath); else EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
            Debug.Log($"TerrainLayerLibrary: {set.Layers.Length} layers ({set.Layers.Count(e => e.Layer == null)} missing) on {shader.name}");
            return set;
        }

        /// <summary>The water's material (step 22) on SecondFace/Water with its ripple map: the sea and the rivers of the
        /// post-war coast are not clear, a grey-green murk with a teal depth.</summary>
        private static Material WaterMaterial()
        {
            var shader = Shader.Find(WaterShaderName);
            if (shader == null) { Debug.LogError($"TerrainLayerLibrary: {WaterShaderName} is missing"); return null; }
            if (!File.Exists(WaterNormalPath))
            {
                File.WriteAllBytes(WaterNormalPath, RippleMap(256, 1909).EncodeToPNG());
                AssetDatabase.ImportAsset(WaterNormalPath);
            }
            var importer = (TextureImporter)AssetImporter.GetAtPath(WaterNormalPath);
            if (importer.textureType != TextureImporterType.NormalMap || importer.wrapMode != TextureWrapMode.Repeat)
            {
                importer.textureType = TextureImporterType.NormalMap;
                importer.wrapMode = TextureWrapMode.Repeat;
                importer.anisoLevel = 2;
                importer.SaveAndReimport();
            }
            var path = Dir + "/Water.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(shader) { name = "Water" }; AssetDatabase.CreateAsset(m, path); }
            if (m.shader != shader) m.shader = shader;
            m.SetTexture("_NormalMap", AssetDatabase.LoadAssetAtPath<Texture2D>(WaterNormalPath));
            m.SetColor("_ShallowColor", new Color(0.32f, 0.36f, 0.28f));
            m.SetColor("_DeepColor", new Color(0.07f, 0.12f, 0.12f));
            m.SetFloat("_DeepAt", 4f);
            m.SetFloat("_Clarity", 0.9f);
            m.SetFloat("_RippleA", 7f);
            m.SetFloat("_RippleB", 19f);
            m.SetFloat("_Strength", 0.7f);
            m.SetFloat("_Smoothness", 0.92f);
            m.SetColor("_FoamColor", new Color(0.74f, 0.73f, 0.68f));
            m.SetFloat("_FoamDepth", 0.22f);
            m.SetFloat("_Edge", 0.12f);
            EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>
        /// A tileable normal map of small water ripples: the slope of a sum of sine waves whose wave numbers are whole
        /// numbers over the tile (so it wraps), in every direction, amplitude falling with the wave number as a wind sea's
        /// does (k^-1.7); scaled to an rms slope of 0.2.
        /// </summary>
        public static Texture2D RippleMap(int size, int seed)
        {
            var rng = new System.Random(seed);
            var waves = new System.Collections.Generic.List<(int kx, int ky, float amp, float phase)>();
            while (waves.Count < 48)
            {
                int kx = rng.Next(-20, 21), ky = rng.Next(-20, 21);
                var k = Mathf.Sqrt(kx * kx + ky * ky);
                if (k < 3) continue;
                waves.Add((kx, ky, Mathf.Pow(k, -1.7f), (float)(rng.NextDouble() * Mathf.PI * 2)));
            }
            var gx = new float[size * size]; var gy = new float[size * size];
            double sum = 0;
            for (var j = 0; j < size; j++)
                for (var i = 0; i < size; i++)
                {
                    float u = (float)i / size, v = (float)j / size, dx = 0, dy = 0;
                    foreach (var (kx, ky, amp, phase) in waves)
                    {
                        var c = amp * Mathf.Cos(2 * Mathf.PI * (kx * u + ky * v) + phase) * 2 * Mathf.PI;
                        dx += c * kx; dy += c * ky;
                    }
                    gx[j * size + i] = dx; gy[j * size + i] = dy;
                    sum += dx * dx + dy * dy;
                }
            var scale = 0.2f / Mathf.Sqrt((float)(sum / (size * size)));
            var tex = new Texture2D(size, size, TextureFormat.RGB24, false, true);
            var px = new Color[size * size];
            for (var k = 0; k < px.Length; k++)
            {
                var n = new Vector3(-gx[k] * scale, -gy[k] * scale, 1f).normalized;
                px[k] = new Color(n.x * 0.5f + 0.5f, n.y * 0.5f + 0.5f, n.z * 0.5f + 0.5f);
            }
            tex.SetPixels(px);
            tex.Apply();
            return tex;
        }
    }
}
