using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>The sea and the rivers (step 22): the river's level falls to the sea and its water stays in its channel, the
    /// sea lies at sea level and its open water is a few big quads, sheets meet across chunk edges, dry land has none.</summary>
    public class WorldWaterTests
    {
        private static TerrainGen _gen;
        private static WorldLayout _layout;
        private static WorldWater _water;

        private static WorldWater Water()
        {
            if (_water != null) return _water;
            var control = ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));
            _layout = WorldLayout.Read(File.ReadAllText(Find("unity/Assets/StreamingAssets/world/places.json")), File.ReadAllText(Find("unity/Assets/StreamingAssets/world/roads.json")));
            var style = StyleMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/style.bin")));
            _gen = new TerrainGen(control, _layout, style);
            return _water = new WorldWater(_gen, _layout);
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

        private static RiverProfile River() { Water(); return _gen.Rivers[0]; }

        [Test]
        public void TheRiverFallsToTheSeaAndNeverStandsAboveItsGround()
        {
            var r = River();
            float last = float.MaxValue;
            for (float s = 0; s <= r.Length; s += RiverProfile.Station)
            {
                var l = r.LevelAt(s);
                Assert.That(l, Is.LessThanOrEqualTo(last + 1e-4f), $"the level rises at {s} m");
                Assert.That(l, Is.GreaterThanOrEqualTo(_layout.SeaLevel), $"under the sea at {s} m");
                var (x, z) = r.PointAt(s);
                Assert.That(l, Is.LessThanOrEqualTo(Math.Max(_layout.SeaLevel, _gen.Natural(x, z) - RiverProfile.Below) + 1e-3f), $"above its ground at {s} m");
                last = l;
            }
            Assert.That(r.LevelAt(0) - r.LevelAt(r.Length), Is.GreaterThan(40f), "it comes down from the Wet");
            Assert.That(r.LevelAt(r.Length), Is.EqualTo(_layout.SeaLevel).Within(1e-3f), "it ends in the sea");
        }

        /// <summary>A chunk the river crosses, a little above where it starts falling.</summary>
        private static (int cx, int cz) RiverChunk(float s)
        {
            var (x, z) = River().PointAt(s);
            return WorldGrid.ChunkAt(x, z);
        }

        [Test]
        public void TheRiversWaterStaysInItsChannel()
        {
            var r = River();
            foreach (var s in new[] { 2000f, 7000f, 9000f })
            {
                var (cx, cz) = RiverChunk(s);
                var h = _gen.Heights(cx, cz);
                var sheet = Water().Build(cx, cz, h);
                Assert.That(sheet, Is.Not.Null, $"no water on the river at {s} m");
                var (x0, z0) = WorldGrid.Origin(cx, cz);
                float deepest = 0;
                for (var v = 0; v < sheet.VertexCount; v++)
                {
                    float x = x0 + sheet.Positions[v * 3], z = z0 + sheet.Positions[v * 3 + 2];
                    var (d, sn, _, _) = r.Nearest(x, z);
                    if (sheet.Depths[v] > 0 && sheet.Positions[v * 3 + 1] > _layout.SeaLevel + 0.5f)
                        Assert.That(d, Is.LessThan(r.HalfAt(sn) + 12f), $"river water out of its channel at ({x}, {z}), depth {sheet.Depths[v]}");
                    if (d < 5f) deepest = Math.Max(deepest, sheet.Depths[v]);
                }
                Assert.That(deepest, Is.GreaterThan(TerrainGen.RiverDepth), $"the river is shallow at its centre at {s} m");
            }
        }

        [Test]
        public void TheSeaLiesAtSeaLevelInAFewBigQuads()
        {
            var (cx, cz) = WorldGrid.ChunkAt(300f, 8000f);   // well out to sea
            var sheet = Water().Build(cx, cz, _gen.Heights(cx, cz));
            Assert.That(sheet, Is.Not.Null);
            for (var v = 0; v < sheet.VertexCount; v++) Assert.That(sheet.Positions[v * 3 + 1], Is.EqualTo(_layout.SeaLevel));
            Assert.That(sheet.Triangles.Count / 3, Is.LessThanOrEqualTo(2 * (WorldWater.Cells / WorldWater.Block) * (WorldWater.Cells / WorldWater.Block) * 2), "open sea is laid in blocks");
        }

        [Test]
        public void TheShoreHasWaterAndLandOnOneChunk()
        {
            // the coast's chunk west of Meridian: some vertices under water, some on land
            var m = Water() != null ? _layout.Places["meridian"] : null;
            var x = 0f;
            while (_gen.Natural(x, m.Centre[1]) < 0) x += 16f;
            var (cx, cz) = WorldGrid.ChunkAt(x, m.Centre[1]);
            var sheet = Water().Build(cx, cz, _gen.Heights(cx, cz));
            Assert.That(sheet, Is.Not.Null);
            Assert.That(sheet.Depths.Any(d => d > 1f), Is.True, "open water");
            Assert.That(sheet.Depths.Any(d => d < 0f), Is.True, "a shore");
        }

        [Test]
        public void SheetsMeetAcrossAChunkEdge()
        {
            var r = River();
            var (cx, cz) = RiverChunk(7000f);
            var a = Water().Build(cx, cz, _gen.Heights(cx, cz));
            var east = Water().Build(cx + 1, cz, _gen.Heights(cx + 1, cz));
            var north = Water().Build(cx, cz + 1, _gen.Heights(cx, cz + 1));
            void Match(WorldWater.Sheet s, WorldWater.Sheet t, bool alongX)
            {
                if (s == null || t == null) return;
                var edge = WorldGrid.Chunk;
                var mine = Enumerable.Range(0, s.VertexCount).Where(v => Math.Abs((alongX ? s.Positions[v * 3] : s.Positions[v * 3 + 2]) - edge) < 0.01f)
                    .ToDictionary(v => alongX ? s.Positions[v * 3 + 2] : s.Positions[v * 3], v => (s.Positions[v * 3 + 1], s.Depths[v]));
                for (var v = 0; v < t.VertexCount; v++)
                {
                    if (Math.Abs(alongX ? t.Positions[v * 3] : t.Positions[v * 3 + 2]) > 0.01f) continue;
                    if (!mine.TryGetValue(alongX ? t.Positions[v * 3 + 2] : t.Positions[v * 3], out var o)) continue;
                    Assert.That(t.Positions[v * 3 + 1], Is.EqualTo(o.Item1).Within(1e-4f));
                    Assert.That(t.Depths[v], Is.EqualTo(o.Item2).Within(1e-3f));
                }
            }
            Match(a, east, true);
            Match(a, north, false);
        }

        [Test]
        public void NothingGrowsInTheRiver()
        {
            var r = River();
            var control = ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));
            var details = new WorldDetails(control, _layout) { Water = Water() };
            var (cx, cz) = RiverChunk(7000f);
            var h = _gen.Heights(cx, cz);
            var result = details.Build(cx, cz, h, _layout.Biomes);
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            const int n = WorldDetails.Resolution;
            const float cell = WorldGrid.Chunk / n;
            var wet = 0;
            for (var l = 0; l < result.Layers.Count; l++)
                for (var j = 0; j < n; j++)
                    for (var i = 0; i < n; i++)
                    {
                        if (result.Counts[l][j * n + i] == 0) continue;
                        float x = x0 + (i + 0.5f) * cell, z = z0 + (j + 0.5f) * cell;
                        var (level, river, _, _) = Water().LevelAt(x, z);
                        if (river && r.Nearest(x, z).d < r.HalfAt(r.Nearest(x, z).s)) wet++;
                    }
            Assert.That(wet, Is.EqualTo(0), "plants in the river's water");
        }

        [Test]
        public void DryLandHasNoWater()
        {
            Water();
            var p = _layout.Places["shale"];
            var (cx, cz) = WorldGrid.ChunkAt(p.Centre[0], p.Centre[1]);
            Assert.That(Water().Build(cx, cz, _gen.Heights(cx, cz)), Is.Null);
        }
    }
}
