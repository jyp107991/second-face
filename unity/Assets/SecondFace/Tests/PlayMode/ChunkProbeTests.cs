// TEMP (never commit): the first chunk's cold-start cost against the second's, stage by stage (editor hand-off 1127d)
using System.Collections;
using System.IO;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    public class ChunkProbeTests
    {
        [UnityTest, Timeout(600000)]
        public IEnumerator FirstChunkAgainstTheSecond()
        {
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var shale = world.PlaceCentre("shale");
            var (ox, oz) = WorldGrid.ChunkAt(shale.x - 256, shale.z - 256);
            var order = new[] { (ox, oz), (ox + 1, oz), (ox, oz), (ox, oz + 1), (ox + 1, oz + 1), (ox + 1, oz) };
            var log = new StringBuilder();
            foreach (var (cx, cz) in order)
            {
                var task = System.Threading.Tasks.Task.Run(() =>
                {
                    var t = new double[7]; var sw = System.Diagnostics.Stopwatch.StartNew();
                    double Lap() { var e = sw.Elapsed.TotalMilliseconds; sw.Restart(); return e; }
                    var heights = world.Gen.Heights(cx, cz); t[0] = Lap();
                    var paint = TerrainPaint.Paint(world.Control, world.Layout.Biomes, heights, cx, cz); t[1] = Lap();
                    var strips = world.Roads?.Build(cx, cz, heights); t[2] = Lap();
                    var small = world.Details?.Build(cx, cz, heights, world.Layout.Biomes); t[3] = Lap();
                    var sheet = world.Water?.Build(cx, cz, heights); t[4] = Lap();
                    var b = TerrainPaint.DominantBiome(world.Control, cx, cz); t[5] = Lap();
                    return t;
                });
                while (!task.IsCompleted) yield return null;
                var r = task.Result;
                log.AppendLine($"chunk_probe: ({cx},{cz}) heights {r[0]:0} paint {r[1]:0} roads {r[2]:0} details {r[3]:0} water {r[4]:0} biome {r[5]:0} total {r[0] + r[1] + r[2] + r[3] + r[4] + r[5]:0} ms");
            }
            // the same through the game's own Prepare, after the warm-up (what the test times)
            foreach (var (cx, cz) in new[] { (ox, oz), (ox + 1, oz + 1) })
            {
                var task = ChunkTerrain.Prepare(world, cx, cz);
                while (!task.IsCompleted) yield return null;
                log.AppendLine($"chunk_probe: Prepare ({cx},{cz}) warm {task.Result.Milliseconds} ms");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/chunk_probe.txt"), log.ToString());
            Debug.Log(log.ToString());
            Object.Destroy(world.gameObject);
        }
    }
}
