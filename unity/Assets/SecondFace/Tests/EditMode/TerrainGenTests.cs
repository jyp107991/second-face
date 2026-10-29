using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class TerrainGenTests
    {
        private static TerrainGen _gen;
        private static WorldLayout _layout;

        private static TerrainGen Gen()
        {
            if (_gen != null) return _gen;
            var control = ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));
            _layout = WorldLayout.Read(File.ReadAllText(Find("unity/Assets/StreamingAssets/world/places.json")), File.ReadAllText(Find("unity/Assets/StreamingAssets/world/roads.json")));
            var style = StyleMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/style.bin")));
            return _gen = new TerrainGen(control, _layout, style);
        }

        private static (int, int) ChunkOf(string place) { Gen(); var p = _layout.Places[place]; return WorldGrid.ChunkAt(p.Centre[0], p.Centre[1]); }

        [Test]
        public void TheSameChunkComesOutTheSameEveryTime()
        {
            var (cx, cz) = ChunkOf("shale");
            Assert.That(Gen().Heights(cx, cz), Is.EqualTo(Gen().Heights(cx, cz)));
        }

        [Test]
        public void NeighbouringChunksMeetWithoutASeam()
        {
            const int n = TerrainGen.Resolution;
            var (cx, cz) = ChunkOf("tollhouse");
            var a = Gen().Heights(cx, cz); var east = Gen().Heights(cx + 1, cz); var north = Gen().Heights(cx, cz + 1);
            for (var k = 0; k < n; k++)
            {
                Assert.That(east[k * n + 0], Is.EqualTo(a[k * n + n - 1]).Within(1e-4f), $"east seam at row {k}");
                Assert.That(north[0 * n + k], Is.EqualTo(a[(n - 1) * n + k]).Within(1e-4f), $"north seam at column {k}");
            }
        }

        [Test]
        public void APlaceStandsOnALevelPadAtItsElevation()
        {
            const int n = TerrainGen.Resolution;
            var p = (Gen(), _layout.Places["shale"]).Item2;
            var (cx, cz) = ChunkOf("shale");
            var h = Gen().Heights(cx, cz);
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            int i = (int)Math.Round((p.Centre[0] - x0) / TerrainGen.Step), j = (int)Math.Round((p.Centre[1] - z0) / TerrainGen.Step);
            var level = Gen().Pad(p).level;
            Assert.That(h[j * n + i], Is.EqualTo(level).Within(0.01f));
            Assert.That(h[j * n + Math.Min(n - 1, i + 10)], Is.EqualTo(level).Within(0.01f), "20 m in, still level");
            Assert.That(level, Is.EqualTo(p.Elevation).Within(25f), "the layout's estimate is near the real pad");
        }

        [Test]
        public void APlaceOnAMountainsideSitsInACutNotAPit()
        {
            const int n = TerrainGen.Resolution;
            Gen();
            var p = _layout.Places["mine_teeth"];
            var (cx, cz) = WorldGrid.ChunkAt(p.Centre[0], p.Centre[1]);
            var h = Gen().Heights(cx, cz);
            float worst = 0, wd = 0;
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            for (var j = 1; j < n - 1; j++)
                for (var i = 1; i < n - 1; i++)
                {
                    float gx = (h[j * n + i + 1] - h[j * n + i - 1]) / (2 * TerrainGen.Step), gz = (h[(j + 1) * n + i] - h[(j - 1) * n + i]) / (2 * TerrainGen.Step);
                    var sl = (float)Math.Sqrt(gx * gx + gz * gz);
                    if (sl > worst) { worst = sl; wd = (float)Math.Sqrt(Math.Pow(x0 + i * TerrainGen.Step - p.Centre[0], 2) + Math.Pow(z0 + j * TerrainGen.Step - p.Centre[1], 2)); }
                }
            TestContext.WriteLine($"steepest {worst:0.00} at {wd:0} m from the pad's centre; pad {Gen().Pad(p)}");
            Assert.That(worst, Is.LessThan(1.6f), "no wall steeper than ~58° round the pad");
        }

        [Test]
        public void HeightsStayInTheWorldsRangeAndTheTeethAreMountains()
        {
            var (sx, sz) = ChunkOf("shale");
            var sallow = Gen().Heights(sx, sz);
            var (tx, tz) = WorldGrid.ChunkAt(21000, 11000);
            var teeth = Gen().Heights(tx, tz);
            Assert.That(sallow.Min(), Is.GreaterThan(ControlMap.Floor)); Assert.That(teeth.Max(), Is.LessThan(ControlMap.Floor + ControlMap.Span + 120));
            Assert.That(teeth.Max() - teeth.Min(), Is.GreaterThan(sallow.Max() - sallow.Min()), "the Teeth have more relief than the scrub");
            Assert.That(teeth.Average(), Is.GreaterThan(sallow.Average() + 150), "and stand far higher");
        }

        [Test]
        public void AChunkBuildsInReasonableTime()
        {
            var (cx, cz) = WorldGrid.ChunkAt(21000, 11000);
            Gen().Heights(cx, cz);   // warm the noise tables
            var sw = Stopwatch.StartNew();
            Gen().Heights(cx + 1, cz);
            sw.Stop();
            TestContext.WriteLine($"chunk heights in {sw.ElapsedMilliseconds} ms");
            Assert.That(sw.ElapsedMilliseconds, Is.LessThan(3000), "a worker thread builds a chunk while the player walks 512 m");
        }

        [Test]
        public void ReliefOfTheTeethAndTheScrub()
        {
            const int n = TerrainGen.Resolution;
            foreach (var (name, x, z) in new[] { ("teeth", 21000f, 11000f), ("teeth2", 20000f, 9000f), ("sallow", 16500f, 5200f) })
            {
                var (cx, cz) = WorldGrid.ChunkAt(x, z);
                var h = Gen().Heights(cx, cz);
                var slopes = new System.Collections.Generic.List<float>();
                for (var j = 1; j < n - 1; j++)
                    for (var i = 1; i < n - 1; i++)
                    {
                        float gx = (h[j * n + i + 1] - h[j * n + i - 1]) / (2 * TerrainGen.Step), gz = (h[(j + 1) * n + i] - h[(j - 1) * n + i]) / (2 * TerrainGen.Step);
                        slopes.Add((float)Math.Sqrt(gx * gx + gz * gz));
                    }
                slopes.Sort();
                float P(double q) => slopes[(int)(q * (slopes.Count - 1))];
                TestContext.WriteLine($"{name}: relief {h.Max() - h.Min():0} m, slope p50 {P(0.5):0.00} p90 {P(0.9):0.00} p99 {P(0.99):0.00}");
            }
        }

        [Test]
        public void EveryBiomeHasFourLayersFromTheTextureLibrary()
        {
            Gen();
            var manifest = File.ReadAllText(Find("tools/unity/assets.py"));
            foreach (var biome in _layout.Biomes)
            {
                Assert.That(TerrainPaint.Palettes.ContainsKey(biome), Is.True, biome);
                var keys = TerrainPaint.Palettes[biome];
                Assert.That(keys.Length, Is.EqualTo(TerrainPaint.Roles), biome);
                foreach (var k in keys) Assert.That(manifest, Does.Contain($"'{k}':"), $"{biome} paints with {k}, which assets.py does not fetch");
            }
        }

        private static ControlMap _control;
        private static ControlMap Control() => _control ??= ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));

        private static float Share(TerrainPaint.Result r, string key)
        {
            var l = Array.IndexOf(r.Keys, key);
            if (l < 0) return 0;
            float s = 0; var L = r.Keys.Length;
            for (var t = 0; t < r.Weights.Length / L; t++) s += r.Weights[t * L + l];
            return s / (r.Weights.Length / L);
        }

        private static void SumsToOne(TerrainPaint.Result r)
        {
            var L = r.Keys.Length;
            Assert.That(r.Weights.Length, Is.EqualTo(TerrainPaint.AlphaResolution * TerrainPaint.AlphaResolution * L));
            for (var t = 0; t < r.Weights.Length / L; t++)
            {
                float s = 0;
                for (var l = 0; l < L; l++) s += r.Weights[t * L + l];
                Assert.That(s, Is.EqualTo(1f).Within(1e-4f), $"texel {t}");
            }
        }

        [Test]
        public void SurfaceWeightsSumToOneAndTheTeethShowRockOnSlopesAndSnowOnTheHeights()
        {
            var (tx, tz) = WorldGrid.ChunkAt(21000, 11000);
            var heights = Gen().Heights(tx, tz);
            var sw = Stopwatch.StartNew();
            var paint = TerrainPaint.Paint(Control(), _layout.Biomes, heights, tx, tz);
            TestContext.WriteLine($"teeth chunk: {string.Join(", ", paint.Keys.Select(k => $"{k} {Share(paint, k):0.00}"))}; heights {heights.Min():0}..{heights.Max():0} m; {sw.ElapsedMilliseconds} ms");
            SumsToOne(paint);
            Assert.That(paint.Keys.Length, Is.InRange(1, TerrainPaint.MaxLayers));
            Assert.That(_layout.Biomes[TerrainPaint.DominantBiome(Control(), tx, tz)], Is.EqualTo("teeth"));
            Assert.That(Share(paint, "rock"), Is.GreaterThan(0.05f), "the mountains show rock on their slopes");
            if (heights.Max() > TerrainPaint.SnowLine + 60) Assert.That(Share(paint, "snow"), Is.GreaterThan(0.01f), "snow above the snow line");
        }

        /// <summary>A chunk on a biome border and its neighbour across the border paint with both palettes (≤ 8 layers),
        /// and the texels either side of their shared edge carry nearly the same weights per key: no palette seam.</summary>
        [Test]
        public void ChunksAcrossABiomeBorderBlendWithoutASeam()
        {
            Gen();
            const int a = TerrainPaint.AlphaResolution;
            (int, int)? pair = null;
            for (var cz = 0; cz < WorldGrid.ChunksZ && pair == null; cz++)
                for (var cx = 0; cx + 1 < WorldGrid.ChunksX && pair == null; cx++)
                {
                    int ba = TerrainPaint.DominantBiome(Control(), cx, cz), bb = TerrainPaint.DominantBiome(Control(), cx + 1, cz);
                    if (ba != bb && _layout.Biomes[ba] == "sallow" && _layout.Biomes[bb] != "sallow") pair = (cx, cz);
                }
            Assert.That(pair, Is.Not.Null, "a sallow chunk with another biome east of it");
            var (x, z) = pair.Value;
            var west = TerrainPaint.Paint(Control(), _layout.Biomes, Gen().Heights(x, z), x, z);
            var east = TerrainPaint.Paint(Control(), _layout.Biomes, Gen().Heights(x + 1, z), x + 1, z);
            TestContext.WriteLine($"border {x},{z}: west {string.Join(", ", west.Keys)}; east {string.Join(", ", east.Keys)}");
            SumsToOne(west); SumsToOne(east);
            Assert.That(west.Keys.Except(TerrainPaint.Palettes["sallow"]), Is.Not.Empty, "the border chunk carries its neighbour's palette too");
            Assert.That(west.Keys.Length, Is.AtMost(TerrainPaint.MaxLayers));
            double diff = 0; var n = 0;
            foreach (var key in west.Keys.Union(east.Keys))
            {
                int lw = Array.IndexOf(west.Keys, key), le = Array.IndexOf(east.Keys, key);
                for (var j = 0; j < a; j++)
                {
                    var w = lw < 0 ? 0 : west.Weights[(j * a + a - 1) * west.Keys.Length + lw];
                    var e = le < 0 ? 0 : east.Weights[(j * a + 0) * east.Keys.Length + le];
                    diff += Math.Abs(w - e); n++;
                }
            }
            TestContext.WriteLine($"mean weight step across the edge: {diff / n:0.000}");
            Assert.That(diff / n, Is.LessThan(0.03), "the same ground paints the same either side of the edge");
        }

        private static string Find(string repoRel)
        {
            foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
                for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
                    foreach (var rel in new[] { repoRel, repoRel.StartsWith("unity/") ? repoRel.Substring("unity/".Length) : "../" + repoRel })
                    {
                        var p = Path.Combine(dir.FullName, rel);
                        if (File.Exists(p)) return p;
                    }
            throw new FileNotFoundException($"{repoRel} not found (tools/unity/world.py writes it)");
        }
    }
}
