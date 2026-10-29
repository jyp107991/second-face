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
            return _gen = new TerrainGen(control, _layout);
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
            Assert.That(h[j * n + i], Is.EqualTo(p.Elevation).Within(0.01f));
            Assert.That(h[j * n + Math.Min(n - 1, i + 10)], Is.EqualTo(p.Elevation).Within(0.01f), "20 m in, still level");
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

        private static string Find(string repoRel)
        {
            foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
                for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
                    foreach (var rel in new[] { repoRel, repoRel.Substring("unity/".Length) })
                    {
                        var p = Path.Combine(dir.FullName, rel);
                        if (File.Exists(p)) return p;
                    }
            throw new FileNotFoundException($"{repoRel} not found (tools/unity/world.py writes it)");
        }
    }
}
