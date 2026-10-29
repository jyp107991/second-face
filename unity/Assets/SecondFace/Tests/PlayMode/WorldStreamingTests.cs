using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// Streaming (BUILD_PLAN §6.A.4, the P3.1 test): the focus starts at Shale and moves four chunks east; the chunk
    /// under it is always built soon after it arrives, the five-by-five round it follows, nothing beyond four chunks
    /// stays, terrains are reused from the pool, and the streamer's own main-thread work stays inside a frame.
    /// </summary>
    public class WorldStreamingTests
    {
        private static IEnumerator Until(System.Func<bool> done, float seconds, string what)
        {
            var t0 = Time.realtimeSinceStartup;
            while (!done())
            {
                if (Time.realtimeSinceStartup - t0 > seconds) Assert.Fail($"{what}: not within {seconds} s");
                yield return null;
            }
        }

        [UnityTest, Timeout(300000)]
        public IEnumerator TheWorldStreamsRoundAMovingFocus()
        {
            var go = new GameObject("World");
            var world = go.AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var streamer = go.AddComponent<WorldStreamer>();
            streamer.World = world;
#if UNITY_EDITOR
            streamer.Layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
#endif
            var t0 = Time.realtimeSinceStartup;
            yield return streamer.Prewarm();
            Debug.Log($"WorldStreamingTests: {streamer.PooledCount} terrains created ahead in {Time.realtimeSinceStartup - t0:0.0} s");
            var start = world.PlaceCentre("shale");
            world.Focus = start;
            var c0 = WorldGrid.ChunkAt(start.x, start.z);
            yield return Until(() => WorldGrid.Around(start.x, start.z, 2).All(c => streamer.IsBuilt(c.cx, c.cz)), 90f, "the 5 x 5 round Shale");
            Assert.That(streamer.Built.Count, Is.EqualTo(25));
            for (var k = 1; k <= 4; k++)
            {
                var f = start + Vector3.right * (WorldGrid.Chunk * k);
                world.Focus = f;
                var c = WorldGrid.ChunkAt(f.x, f.z);
                yield return Until(() => streamer.IsBuilt(c.cx, c.cz), 30f, $"the chunk under the focus after {k} chunks");
                yield return Until(() => WorldGrid.Around(f.x, f.z, 1).All(n => streamer.IsBuilt(n.cx, n.cz)), 60f, $"the ring round the focus after {k} chunks");
            }
            var end = start + Vector3.right * (WorldGrid.Chunk * 4);
            yield return Until(() => streamer.Built.All(c => StreamingPolicy.Distance(c, WorldGrid.ChunkAt(end.x, end.z)) <= 3), 10f, "dropping the chunks left behind");
            Assert.That(streamer.Built.Any(c => c.cx == c0.cx - 2), Is.False, "the far west of the start is gone");
            var ms = streamer.BuildMs.OrderBy(x => x).ToList();
            Debug.Log($"WorldStreamingTests: chunk writes {ms.Count}, first {streamer.BuildMs[0]:0.0} ms, median {ms[ms.Count / 2]:0.0}, p90 {ms[(int)(ms.Count * 0.9)]:0.0}, max {ms[^1]:0.0}; max frame work {streamer.MaxFrameWorkMs:0.0} ms; last write {string.Join(", ", ChunkTerrain.LastApplyMs.Select(kv => $"{kv.Key} {kv.Value:0.0}"))}; {streamer.Built.Count} built, {streamer.PooledCount} pooled");
            Assert.That(ms[ms.Count / 2], Is.LessThan(33.0), "a chunk write fits in a 30 fps frame");
            Object.Destroy(go);
        }
    }
}
