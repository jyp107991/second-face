using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class WorldMapTests
    {
        [Test]
        public void TheGridCoversTheWorldIn512MetreChunks()
        {
            Assert.That(WorldGrid.ChunksX, Is.EqualTo(47));
            Assert.That(WorldGrid.ChunksZ, Is.EqualTo(32));
            Assert.That(WorldGrid.ChunkAt(0, 0), Is.EqualTo((0, 0)));
            Assert.That(WorldGrid.ChunkAt(511.9f, 512f), Is.EqualTo((0, 1)));
            Assert.That(WorldGrid.ChunkAt(23999f, 15999f), Is.EqualTo((46, 31)));
            Assert.That(WorldGrid.ChunkAt(-10f, 99999f), Is.EqualTo((0, 31)), "clamped to the world");
            Assert.That(WorldGrid.Origin(3, 2), Is.EqualTo((1536f, 1024f)));
        }

        [Test]
        public void ChunksAroundAPointComeNearestFirstAndStayInsideTheWorld()
        {
            var around = WorldGrid.Around(5000f, 5000f, 2);
            Assert.That(around.Count, Is.EqualTo(25));
            Assert.That(around[0], Is.EqualTo(WorldGrid.ChunkAt(5000f, 5000f)));
            Assert.That(around.Distinct().Count(), Is.EqualTo(25));
            var corner = WorldGrid.Around(10f, 10f, 2);
            Assert.That(corner.Count, Is.EqualTo(9), "only the chunks that exist");
            Assert.That(corner.All(c => WorldGrid.ValidChunk(c.cx, c.cz)), Is.True);
            Assert.That(WorldGrid.Around(5000f, 5000f, 2), Is.EqualTo(around), "the order is stable");
            Assert.That(WorldGrid.Around(15360f, 4480f, 1)[0], Is.EqualTo(WorldGrid.ChunkAt(15360f, 4480f)), "a point on a border: its own chunk first");
        }

        [Test]
        public void TheControlMapSamplesBilinearlyAndKeepsTheNearestBiome()
        {
            // 2 × 2 texels 64 m apart: heights 0 and 60 m along x, biome 3 on the east column, water on the north row
            ushort H(float m) => (ushort)Math.Round((m - ControlMap.Floor) / ControlMap.Span * 65535);
            var data = new ushort[]
            {
                H(0), 0, 0, 0,          H(60), 65535, 3 * 4096, 0,
                H(0), 0, 0, 65535,      H(60), 65535, 3 * 4096, 65535,
            };
            var map = new ControlMap(2, 2, 64, data);
            var mid = map.Sample(32, 32);
            Assert.That(mid.Height, Is.EqualTo(30f).Within(0.05f));
            Assert.That(mid.Roughness, Is.EqualTo(0.5f).Within(0.001f));
            Assert.That(mid.Water, Is.EqualTo(0.5f).Within(0.001f));
            Assert.That(map.Sample(10, 10).Biome, Is.EqualTo(0));
            Assert.That(map.Sample(60, 10).Biome, Is.EqualTo(3));
            Assert.That(map.Sample(-500, -500).Height, Is.EqualTo(0f).Within(0.05f), "clamped at the edge");
        }

        [Test]
        public void TheControlFileRoundTrips()
        {
            var data = Enumerable.Range(0, 3 * 2 * 4).Select(i => (ushort)(i * 1000)).ToArray();
            var bytes = new byte[20 + data.Length * 2];
            System.Text.Encoding.ASCII.GetBytes("SFCM").CopyTo(bytes, 0);
            BitConverter.GetBytes(1).CopyTo(bytes, 4); BitConverter.GetBytes(3).CopyTo(bytes, 8);
            BitConverter.GetBytes(2).CopyTo(bytes, 12); BitConverter.GetBytes(64).CopyTo(bytes, 16);
            Buffer.BlockCopy(data, 0, bytes, 20, data.Length * 2);
            var map = ControlMap.Read(bytes);
            Assert.That((map.Width, map.Height, map.MetresPerTexel), Is.EqualTo((3, 2, 64)));
            Assert.Throws<InvalidDataException>(() => ControlMap.Read(bytes.Take(30).ToArray()));
        }

        // --- the files tools/unity/world.py wrote ------------------------------------------------------------------

        private static ControlMap Control() => ControlMap.Read(File.ReadAllBytes(Find("unity/Assets/StreamingAssets/world/control.bin")));
        private static WorldLayout Layout() => WorldLayout.Read(File.ReadAllText(Find("unity/Assets/StreamingAssets/world/places.json")),
            File.ReadAllText(Find("unity/Assets/StreamingAssets/world/roads.json")));

        [Test]
        public void TheWorldsControlMapCoversTheWorld()
        {
            var map = Control();
            Assert.That((map.Width - 1) * map.MetresPerTexel, Is.GreaterThanOrEqualTo(WorldGrid.Width));
            Assert.That((map.Height - 1) * map.MetresPerTexel, Is.GreaterThanOrEqualTo(WorldGrid.Depth));
            Assert.That(map.Sample(100, 8000).Water, Is.GreaterThan(0.9f), "the sea lies along the west edge");
            Assert.That(map.Sample(21000, 11000).Height, Is.GreaterThan(250f), "the Teeth rise high inside their bounds in the north-east");
        }

        [Test]
        public void EveryPlaceStandsInTheWorldOnDryGroundOfItsOwnRegion()
        {
            var layout = Layout(); var map = Control();
            Assert.That(layout.Places.Count, Is.GreaterThanOrEqualTo(28));
            foreach (var p in layout.Places.Values)
            {
                Assert.That(WorldGrid.InWorld(p.Centre[0], p.Centre[1]), Is.True, p.Id);
                Assert.That(p.Elevation, Is.GreaterThan(layout.SeaLevel), $"{p.Id} stands above the sea");
                var s = map.Sample(p.Centre[0], p.Centre[1]);
                if (p.Offshore) { Assert.That(s.Water, Is.GreaterThan(0.5f), $"{p.Id} stands in the sea"); continue; }
                Assert.That(s.Water, Is.LessThan(0.5f), $"{p.Id} is not in the water");
                if (!p.Id.StartsWith("site_")) Assert.That(layout.Biomes[s.Biome], Is.EqualTo(p.Region), $"{p.Id} stands on its own region's ground");
            }
            Assert.That(layout.Places["shale"].Contains(layout.Places["shale"].Centre[0], layout.Places["shale"].Centre[1]), Is.True);
        }

        [Test]
        public void PlacesDoNotOverlapAndRoadsJoinPlaces()
        {
            var layout = Layout();
            var places = layout.Places.Values.ToList();
            for (var i = 0; i < places.Count; i++)
                for (var j = i + 1; j < places.Count; j++)
                {
                    PlaceInfo a = places[i], b = places[j];
                    var overlap = Math.Abs(a.Centre[0] - b.Centre[0]) < (a.Size[0] + b.Size[0]) / 2 - 0.5f && Math.Abs(a.Centre[1] - b.Centre[1]) < (a.Size[1] + b.Size[1]) / 2 - 0.5f;
                    Assert.That(overlap, Is.False, $"{a.Id} overlaps {b.Id}");
                }
            Assert.That(layout.Roads, Is.Not.Empty);
            foreach (var r in layout.Roads)
            {
                var ends = r.Id.Split('-');
                Assert.That(layout.Places.ContainsKey(ends[0]) && layout.Places.ContainsKey(ends[1]), Is.True, r.Id);
                Assert.That(layout.Places[ends[0]].Contains(r.Points[0][0], r.Points[0][1], 1f), Is.True, $"{r.Id} starts at {ends[0]}");
                Assert.That(r.Width, Is.InRange(2f, 12f));
            }
            Assert.That(layout.Rails.Single().Points.Count, Is.GreaterThan(10));
            Assert.That(layout.PlacesIn(WorldGrid.ChunkAt(layout.Places["shale"].Centre[0], layout.Places["shale"].Centre[1]).cx,
                WorldGrid.ChunkAt(layout.Places["shale"].Centre[0], layout.Places["shale"].Centre[1]).cz).Select(p => p.Id), Does.Contain("shale"));
        }

        /// <summary>A repository file from the .NET test run (repo root above) or the editor (the unity/ project).</summary>
        private static string Find(string repoRel)
        {
            foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
            {
                for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
                    foreach (var rel in new[] { repoRel, repoRel.Substring("unity/".Length) })
                    {
                        var p = Path.Combine(dir.FullName, rel);
                        if (File.Exists(p)) return p;
                    }
            }
            throw new FileNotFoundException($"{repoRel} not found (tools/unity/world.py writes it)");
        }
    }
}
