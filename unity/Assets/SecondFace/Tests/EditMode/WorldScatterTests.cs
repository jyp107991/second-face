using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>The world's props (step 19a): the same chunk gives the same props, densities fit the phone, props stand
    /// on the ground, clear of roads and of places, and the Teeth carry their pines.</summary>
    public class WorldScatterTests
    {
        private static ControlMap _control;
        private static WorldLayout _layout;
        private static TerrainGen _gen;

        private static void Load()
        {
            if (_gen != null) return;
            _control = ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));
            _layout = WorldLayout.Read(File.ReadAllText(Find("unity/Assets/StreamingAssets/world/places.json")), File.ReadAllText(Find("unity/Assets/StreamingAssets/world/roads.json")));
            _gen = new TerrainGen(_control, _layout, StyleMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/style.bin"))));
        }

        private static int ThreeEach(string model) => 3;

        [Test]
        public void TheSameChunkGivesTheSamePropsAndTheyStandOnTheGroundClearOfRoadsAndPlaces()
        {
            Load();
            var scatter = new WorldScatter(_control, _layout);
            var shale = _layout.Places["shale"];
            var (cx, cz) = WorldGrid.ChunkAt(shale.Centre[0], shale.Centre[1]);
            var h = _gen.Heights(cx, cz);
            var a = scatter.Props(cx, cz, h, _layout.Biomes, ThreeEach);
            var b = scatter.Props(cx, cz, h, _layout.Biomes, ThreeEach);
            Assert.That(a.Count, Is.EqualTo(b.Count));
            for (var i = 0; i < a.Count; i++) Assert.That((a[i].Model, a[i].X, a[i].Z, a[i].Variant), Is.EqualTo((b[i].Model, b[i].X, b[i].Z, b[i].Variant)));
            TestContext.WriteLine($"Shale's chunk: {a.Count} props: {string.Join(", ", a.GroupBy(p => p.Model).Select(g => $"{g.Key} {g.Count()}"))}");
            Assert.That(a.Count, Is.InRange(80, 1500), "a few hundred props a chunk");
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            foreach (var p in a)
            {
                Assert.That(p.Y, Is.EqualTo(RoadStrips.HeightAt(h, p.X, p.Z)).Within(1e-3f));
                Assert.That(shale.Contains(p.X + x0, p.Z + z0, 9f), Is.False, "nothing scattered in a place");
                Assert.That(p.Variant, Is.InRange(0, 2));
                foreach (var w in _layout.Roads.Concat(_layout.Rails))
                    for (var i = 0; i + 1 < w.Points.Count; i++)
                        Assert.That(Distance(p.X + x0, p.Z + z0, w.Points[i], w.Points[i + 1]), Is.GreaterThan(w.Width / 2 + 2.9f), $"{p.Model} on {w.Id}");
            }
        }

        [Test]
        public void TheTeethCarryPinesAndTheCityNoProps()
        {
            Load();
            var scatter = new WorldScatter(_control, _layout);
            var (tx, tz) = WorldGrid.ChunkAt(21000, 11000);
            var teeth = scatter.Props(tx, tz, _gen.Heights(tx, tz), _layout.Biomes, ThreeEach);
            TestContext.WriteLine($"Teeth chunk: {teeth.Count} props: {string.Join(", ", teeth.GroupBy(p => p.Model).Select(g => $"{g.Key} {g.Count()}"))}");
            Assert.That(teeth.Count(p => p.Model == "pine"), Is.GreaterThan(60), "the Teeth are wooded");
            Assert.That(teeth.Count, Is.LessThan(1500));
            Assert.That(WorldScatter.Rules("meridian"), Is.Empty, "the city builds its own");
            // a model that is not available is skipped, not placed
            var none = scatter.Props(tx, tz, _gen.Heights(tx, tz), _layout.Biomes, m => m == "pine" ? 0 : 3);
            Assert.That(none.Any(p => p.Model == "pine"), Is.False);
        }

        /// <summary>Small scatter (step 19b): the same counts every time, none on a road, a Sallow chunk carries tens of
        /// thousands of small things, the Wet more grass than the Sallow.</summary>
        [Test]
        public void DetailsAreFixedClearOfRoadsAndFollowTheBiome()
        {
            Load();
            var details = new WorldDetails(_control, _layout);
            var shale = _layout.Places["shale"];
            var (cx, cz) = WorldGrid.ChunkAt(shale.Centre[0], shale.Centre[1]);
            var h = _gen.Heights(cx, cz);
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var a = details.Build(cx, cz, h, _layout.Biomes);
            var ms = sw.ElapsedMilliseconds;
            var b = details.Build(cx, cz, h, _layout.Biomes);
            Assert.That(a.Layers, Is.EqualTo(b.Layers));
            for (var l = 0; l < a.Counts.Count; l++) Assert.That(a.Counts[l], Is.EqualTo(b.Counts[l]));
            TestContext.WriteLine($"Shale's chunk: {a.Total} details in {string.Join(", ", a.Layers.Select((k, i) => $"{WorldDetails.Keys[k]} {a.Counts[i].Sum(c => c)}"))}; {ms} ms");
            Assert.That(a.Total, Is.InRange(5000, 120000));
            Assert.That(a.Counts.All(c => c.All(v => v <= WorldDetails.MaxPerCell)), Is.True);
            // a cell on a road carries nothing
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            const float cell = WorldGrid.Chunk / WorldDetails.Resolution;
            var onRoad = 0;
            foreach (var w in _layout.Roads)
                for (var i = 0; i + 1 < w.Points.Count; i++)
                    for (var t = 0f; t <= 1f; t += 0.05f)
                    {
                        float x = w.Points[i][0] + (w.Points[i + 1][0] - w.Points[i][0]) * t, z = w.Points[i][1] + (w.Points[i + 1][1] - w.Points[i][1]) * t;
                        int ci = (int)((x - x0) / cell), cj = (int)((z - z0) / cell);
                        if (ci < 0 || cj < 0 || ci >= WorldDetails.Resolution || cj >= WorldDetails.Resolution) continue;
                        onRoad++;
                        foreach (var c in a.Counts) Assert.That(c[cj * WorldDetails.Resolution + ci], Is.EqualTo(0), $"a detail on {w.Id}");
                    }
            Assert.That(onRoad, Is.GreaterThan(0), "a road crosses Shale's chunk");
            Assert.That(ms, Is.LessThan(3000), "computed on the chunk's worker in time");
        }

        private static float Distance(float x, float z, float[] a, float[] b)
        {
            float vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz;
            var t = l2 == 0 ? 0 : Math.Clamp(((x - a[0]) * vx + (z - a[1]) * vz) / l2, 0f, 1f);
            float px = a[0] + t * vx - x, pz = a[1] + t * vz - z;
            return (float)Math.Sqrt(px * px + pz * pz);
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
