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
            if (freshSet) AssetDatabase.CreateAsset(set, SetPath); else EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
            Debug.Log($"TerrainLayerLibrary: {set.Layers.Length} layers ({set.Layers.Count(e => e.Layer == null)} missing) on {shader.name}");
            return set;
        }
    }
}
