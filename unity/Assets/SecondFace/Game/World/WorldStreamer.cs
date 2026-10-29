using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// Streams the world's terrain round the focus (BUILD_PLAN §6.A.4) by Core's <see cref="StreamingPolicy"/>: chunk
    /// ground is computed on worker threads ahead of need, at most one chunk is written to a terrain a frame (none after a
    /// frame slower than 25 ms), terrains are pooled and reused, neighbours are stitched. Scatter, places and interiors
    /// join the same loop in later steps.
    /// </summary>
    public sealed class WorldStreamer : MonoBehaviour
    {
        public WorldService World;
        public BiomeLayerSet Layers;
        public readonly StreamingPolicy Policy = new StreamingPolicy();
        /// <summary>After a frame slower than this, no chunk is written the next frame.</summary>
        public float SlowFrameMs = 25f;

        private readonly Dictionary<(int cx, int cz), Terrain> _built = new();
        private readonly Dictionary<(int cx, int cz), ChunkTerrain.Prepared> _prepared = new();
        private readonly Dictionary<(int cx, int cz), Task<ChunkTerrain.Prepared>> _preparing = new();
        private readonly Stack<Terrain> _pool = new();
        private Transform _root;

        /// <summary>Chunks with a terrain in the scene.</summary>
        public IReadOnlyCollection<(int cx, int cz)> Built => _built.Keys;
        /// <summary>The longest main-thread time the streamer has taken in one frame, milliseconds.</summary>
        public double MaxFrameWorkMs { get; private set; }
        /// <summary>Main-thread milliseconds of every chunk write, in order (for the profiler pass and the tests).</summary>
        public readonly List<double> BuildMs = new();
        public int PooledCount => _pool.Count;

        public bool IsBuilt(int cx, int cz) => _built.ContainsKey((cx, cz));
        public Terrain TerrainAt(int cx, int cz) => _built.TryGetValue((cx, cz), out var t) ? t : null;

        private void Awake() => _root = new GameObject("Terrain").transform;

        /// <summary>Creates the pool of terrains ahead (one a frame, while the title shows): creating a terrain is the
        /// expensive part of a chunk write (~90 ms in the editor against ~10 ms to re-fill a pooled one).</summary>
        public IEnumerator Prewarm(int count = -1)
        {
            if (count < 0) count = Policy.MaxBuilt;
            while (_pool.Count + _built.Count < count)
            {
                var t = ChunkTerrain.Create(_root, Layers);
                t.drawHeightmap = false;
                _pool.Push(t);
                yield return null;
            }
        }

        private void Update()
        {
            if (World == null || !World.Ready) return;
            var sw = Stopwatch.StartNew();
            // finished work comes home
            List<(int, int)> done = null;
            foreach (var kv in _preparing)
                if (kv.Value.IsCompleted) (done ??= new List<(int, int)>()).Add(kv.Key);
            if (done != null)
                foreach (var c in done)
                {
                    var task = _preparing[c]; _preparing.Remove(c);
                    if (task.Exception != null) { UnityEngine.Debug.LogError($"WorldStreamer: chunk {c} failed: {task.Exception.InnerException}"); continue; }
                    _prepared[c] = task.Result;
                }
            var step = Policy.Next(World.Focus.x, World.Focus.z, _built.Keys, _prepared.Keys, _preparing.Keys);
            foreach (var c in step.Unload)
            {
                var t = _built[c]; _built.Remove(c);
                t.drawHeightmap = false;   // stays active in the pool: activation is the expensive part of a write
                _pool.Push(t);
                Stitch(c);
            }
            foreach (var c in step.Forget) _prepared.Remove(c);
            foreach (var c in step.Prepare) _preparing[c] = ChunkTerrain.Prepare(World.Gen, World.Control, World.Layout.Biomes, c.cx, c.cz);
            if (step.Build is { } b && Time.unscaledDeltaTime * 1000f <= SlowFrameMs)
            {
                var bw = Stopwatch.StartNew();
                var t = _pool.Count > 0 ? _pool.Pop() : ChunkTerrain.Create(_root, Layers);
                ChunkTerrain.Apply(t, _prepared[b], Layers);
                BuildMs.Add(bw.Elapsed.TotalMilliseconds);
                _built[b] = t;
                Stitch(b);
            }
            sw.Stop();
            if (sw.Elapsed.TotalMilliseconds > MaxFrameWorkMs) MaxFrameWorkMs = sw.Elapsed.TotalMilliseconds;
        }

        /// <summary>Tells a chunk and its four neighbours who is next to them (LOD seams match across neighbours).</summary>
        private void Stitch((int cx, int cz) c)
        {
            foreach (var (dx, dz) in new[] { (0, 0), (1, 0), (-1, 0), (0, 1), (0, -1) })
            {
                var k = (c.cx + dx, c.cz + dz);
                if (!_built.TryGetValue(k, out var t)) continue;
                t.SetNeighbors(TerrainAt(k.Item1 - 1, k.Item2), TerrainAt(k.Item1, k.Item2 + 1), TerrainAt(k.Item1 + 1, k.Item2), TerrainAt(k.Item1, k.Item2 - 1));
            }
        }
    }
}
