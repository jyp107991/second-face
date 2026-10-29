using System.IO;
using SecondFace.Core.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The world map's sheet (P5.3g): the whole world painted from the same terrain the game streams (Core
    /// <see cref="TerrainGen.Natural"/> on the control and style maps), as a surveyor's map on paper: a muted colour per
    /// biome (snow on the high Teeth), relief shaded from the north-west, contours every 50 m (every 250 m stronger), the
    /// sea and lakes, the river, the roads and the rail line; a paper grain and a darker edge. Written to
    /// <see cref="SheetPath"/> (north up, west left) at <see cref="Width"/> pixels across; the map screen lays the places,
    /// the player and the pins over it.
    /// </summary>
    public static class MapBake
    {
        public const string SheetPath = "Assets/SecondFace/UI/Map/world.jpg";
        public const int Width = 2048;
        public static int Height => Mathf.RoundToInt(Width * WorldGrid.Depth / WorldGrid.Width);

        private static readonly Color Paper = new(0.93f, 0.90f, 0.82f);
        private static readonly Color Sea = new(0.55f, 0.65f, 0.66f);
        private static readonly Color River = new(0.42f, 0.55f, 0.58f);
        private static readonly Color Road = new(0.42f, 0.33f, 0.24f);
        private static readonly Color Rail = new(0.18f, 0.16f, 0.14f);

        /// <summary>A biome's colour on the map (by the world's biome order).</summary>
        private static Color BiomeColour(string biome) => biome switch
        {
            "sallow" => new Color(0.85f, 0.75f, 0.56f),
            "glass_flats" => new Color(0.89f, 0.86f, 0.78f),
            "rail_corridor" => new Color(0.80f, 0.72f, 0.56f),
            "drowned_shore" => new Color(0.66f, 0.71f, 0.60f),
            "meridian" => new Color(0.72f, 0.69f, 0.63f),
            "teeth" => new Color(0.56f, 0.61f, 0.48f),
            "ashlands" => new Color(0.45f, 0.42f, 0.40f),
            "northern_wet" => new Color(0.62f, 0.69f, 0.52f),
            _ => new Color(0.80f, 0.76f, 0.66f),
        };

        [MenuItem("Second Face/Bake the world map")]
        public static void Bake()
        {
            string Find(string p) => Path.Combine(Application.dataPath, "StreamingAssets", "world", p);
            var control = ControlMap.Read(File.ReadAllBytes(Find("control.bin")));
            var style = StyleMap.Read(File.ReadAllBytes(Find("style.bin")));
            var layout = WorldLayout.Read(File.ReadAllText(Find("places.json")), File.ReadAllText(Find("roads.json")));
            var gen = new TerrainGen(control, layout, style);
            int w = Width, h = Height;
            float mpp = WorldGrid.Width / w;   // metres a pixel
            // heights first (one sample a pixel, plus a border for the slopes)
            var height = new float[(w + 2) * (h + 2)];
            for (var y = -1; y <= h; y++)
            for (var x = -1; x <= w; x++)
            {
                var (wx, wz) = World(x, y, w, h);
                height[(y + 1) * (w + 2) + x + 1] = gen.Natural(Mathf.Clamp(wx, 0, WorldGrid.Width - 1), Mathf.Clamp(wz, 0, WorldGrid.Depth - 1));
            }
            float H(int x, int y) => height[(y + 1) * (w + 2) + x + 1];
            var px = new Color[w * h];
            var light = new Vector3(-1f, 1.1f, 1f).normalized;   // from the north-west, high
            for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++)
            {
                var (wx, wz) = World(x, y, w, h);
                var c = control.Sample(wx, wz);
                var e = H(x, y);
                Color col;
                if (e < layout.SeaLevel + 0.2f || c.Water > 0.5f) col = Color.Lerp(Sea, Sea * 0.82f, Mathf.Clamp01((layout.SeaLevel - e) / 30f));
                else
                {
                    // the biome's colour, from four samples spread about a warped point: the control map's 64 m cells
                    // become soft, wandering borders
                    var warpX = wx + 260f * Noise.Fbm(wx / 1400f, wz / 1400f, 31, 3);
                    var warpZ = wz + 260f * Noise.Fbm(wx / 1400f + 17f, wz / 1400f, 32, 3);
                    col = Color.clear;
                    var biome = "";
                    for (var k = 0; k < 4; k++)
                    {
                        var ox = (k % 2 == 0 ? -1f : 1f) * 70f;
                        var oz = (k < 2 ? -1f : 1f) * 70f;
                        var b = control.Sample(Mathf.Clamp(warpX + ox, 0, WorldGrid.Width - 1), Mathf.Clamp(warpZ + oz, 0, WorldGrid.Depth - 1)).Biome;
                        var name = b >= 0 && b < layout.Biomes.Length ? layout.Biomes[b] : "";
                        if (k == 0) biome = name;
                        col += BiomeColour(name) * 0.25f;
                    }
                    col.a = 1f;
                    if (biome == "teeth") col = Color.Lerp(col, new Color(0.95f, 0.95f, 0.92f), Mathf.Clamp01((e - 260f) / 60f));
                    // relief: the slope against the light (rows run north to south, so y+1 is south)
                    var dx = (H(x + 1, y) - H(x - 1, y)) / (2f * mpp);
                    var dz = (H(x, y - 1) - H(x, y + 1)) / (2f * mpp);
                    var n = new Vector3(-dx, 1f, -dz).normalized;
                    var shade = Mathf.Clamp01(Vector3.Dot(n, light) / light.y);
                    col *= Mathf.Lerp(0.62f, 1.14f, shade);
                    // contours: where the 50 m bands change between neighbours
                    var band = Mathf.FloorToInt(e / 50f);
                    if (band != Mathf.FloorToInt(H(x + 1, y) / 50f) || band != Mathf.FloorToInt(H(x, y + 1) / 50f))
                        col *= band % 5 == 0 ? 0.80f : 0.90f;
                    // the shore, a darker line
                    if (H(x + 1, y) < layout.SeaLevel || H(x, y + 1) < layout.SeaLevel) col *= 0.78f;
                }
                // paper: a grain and a tint toward the sheet
                var grain = 0.97f + 0.06f * Noise.Fbm(x / 3f, y / 3f, 77, 2);
                col = Color.Lerp(col, Paper, 0.18f) * grain;
                col.a = 1f;
                px[(h - 1 - y) * w + x] = col;   // Texture2D rows run bottom up
            }
            foreach (var r in layout.Rivers) Polyline(px, w, h, r, River, Mathf.Clamp(r.Width / mpp, 2.5f, 6f));
            foreach (var r in layout.Roads) Polyline(px, w, h, r, Road, 1.6f, dash: r.Kind == "track" ? 6f : 0f);
            foreach (var r in layout.Rails) { Polyline(px, w, h, r, Rail, 2.2f); Polyline(px, w, h, r, Paper, 0.8f, dash: 5f); }
            // a darker edge, as a sheet handled for years
            for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++)
            {
                var edge = Mathf.Min(Mathf.Min(x, w - 1 - x), Mathf.Min(y, h - 1 - y)) / (float)(w * 0.04f);
                if (edge < 1f) px[y * w + x] *= Mathf.Lerp(0.82f, 1f, Mathf.SmoothStep(0f, 1f, edge));
            }
            var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
            tex.SetPixels(px);
            tex.Apply();
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(SheetPath)));
            File.WriteAllBytes(Path.GetFullPath(SheetPath), tex.EncodeToJPG(92));   // the paper grain makes a PNG of 4 MB
            Object.DestroyImmediate(tex);
            AssetDatabase.ImportAsset(SheetPath);
            if (AssetImporter.GetAtPath(SheetPath) is TextureImporter ti)
            {
                ti.textureType = TextureImporterType.Default;
                ti.sRGBTexture = true;
                ti.mipmapEnabled = true;
                ti.maxTextureSize = 2048;
                ti.wrapMode = TextureWrapMode.Clamp;
                ti.textureCompression = TextureImporterCompression.Compressed;
                ti.SaveAndReimport();
            }
            Debug.Log($"MapBake: {SheetPath} {w}×{h} ({mpp:0.0} m a pixel)");
        }

        /// <summary>A pixel's centre in world metres (north up: the first row is the north edge).</summary>
        private static (float x, float z) World(int x, int y, int w, int h) =>
            ((x + 0.5f) / w * WorldGrid.Width, WorldGrid.Depth - (y + 0.5f) / h * WorldGrid.Depth);

        /// <summary>Draws a way as a soft line of a width in pixels (dashed when <paramref name="dash"/> &gt; 0).</summary>
        private static void Polyline(Color[] px, int w, int h, WayInfo way, Color colour, float width, float dash = 0f)
        {
            var travelled = 0f;
            for (var i = 0; i + 1 < way.Points.Count; i++)
            {
                var a = Pixel(way.Points[i], w, h);
                var b = Pixel(way.Points[i + 1], w, h);
                var len = Vector2.Distance(a, b);
                var steps = Mathf.Max(1, Mathf.CeilToInt(len * 2f));
                for (var s = 0; s <= steps; s++)
                {
                    var t = s / (float)steps;
                    var d = travelled + t * len;
                    if (dash > 0f && (d / dash) % 2f > 1f) continue;
                    Stamp(px, w, h, Vector2.Lerp(a, b, t), width * 0.5f, colour);
                }
                travelled += len;
            }
        }

        private static Vector2 Pixel(float[] p, int w, int h) =>
            new(p[0] / WorldGrid.Width * w, p[1] / WorldGrid.Depth * h);   // rows bottom up: z grows upward

        private static void Stamp(Color[] px, int w, int h, Vector2 c, float r, Color colour)
        {
            var x0 = Mathf.FloorToInt(c.x - r - 1); var x1 = Mathf.CeilToInt(c.x + r + 1);
            var y0 = Mathf.FloorToInt(c.y - r - 1); var y1 = Mathf.CeilToInt(c.y + r + 1);
            for (var y = y0; y <= y1; y++)
            for (var x = x0; x <= x1; x++)
            {
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                var d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), c);
                var a = Mathf.Clamp01(r + 0.5f - d);
                if (a <= 0f) continue;
                var i = y * w + x;
                px[i] = Color.Lerp(px[i], colour, a * 0.9f);
            }
        }
    }
}
