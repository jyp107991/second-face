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
    /// frame slower than 25 ms), terrains are pooled and reused, neighbours are stitched. With a <see cref="Catalog"/> the
    /// chunks within <see cref="PropRadius"/> of the focus carry their props (<see cref="ScatterSpawner"/>; dropped beyond
    /// one more chunk, so a wandering focus does not churn them). With <see cref="Places"/> the built places near the focus
    /// stand on their pads (<see cref="PlaceSpawner"/>). Interiors join the same loop later.
    /// </summary>
    public sealed class WorldStreamer : MonoBehaviour
    {
        public WorldService World;
        public BiomeLayerSet Layers;
        public ScatterCatalog Catalog;
        /// <summary>The terrain's small scatter (loaded by <see cref="Prewarm"/> before the first terrain is made).</summary>
        public DetailSet Details;
        /// <summary>Chunks within this many of the focus carry their props (the iso camera sees ~150 m round it).</summary>
        public int PropRadius = 1;
        public ScatterSpawner Spawner { get; private set; }
        /// <summary>The places built as prefabs (step 20), put in round the focus by <see cref="PlaceSpawner"/>.</summary>
        public PlaceSet Places;
        public PlaceSpawner PlaceSpawner { get; private set; }
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

        private void OnEnable() => WorldView.Changed += View;
        private void OnDisable() => WorldView.Changed -= View;

        /// <summary>Under the ground the surface is not drawn: terrains (with their roads and small scatter) and props.</summary>
        private void View(bool below)
        {
            foreach (var t in _built.Values) Draw(t, !below);
            if (Spawner != null) Spawner.SetVisible(!below);
        }

        /// <summary>Rectangles the terrain is cut away over, by owner (a place's tunnel mouth: <see cref="PlaceHole"/>).</summary>
        private readonly Dictionary<string, List<Rect>> _holes = new();
        private readonly HashSet<Terrain> _holed = new();

        public void SetHoles(string owner, List<Rect> rects)
        {
            if (rects == null || rects.Count == 0) _holes.Remove(owner); else _holes[owner] = rects;
            foreach (var kv in _built) Holes(kv.Key, kv.Value);
        }

        private void Holes((int cx, int cz) c, Terrain t)
        {
            var (x0, z0) = WorldGrid.Origin(c.cx, c.cz);
            var chunk = new Rect(x0, z0, WorldGrid.Chunk, WorldGrid.Chunk);
            var mine = new List<Rect>();
            foreach (var list in _holes.Values) foreach (var r in list) if (r.Overlaps(chunk)) mine.Add(r);
            if (mine.Count == 0) { if (_holed.Remove(t)) ChunkTerrain.SetHoles(t, x0, z0, mine); return; }
            ChunkTerrain.SetHoles(t, x0, z0, mine);
            _holed.Add(t);
        }

        /// <summary>The road strips switched off for the view under the ground (unused strips stay off coming back up).</summary>
        private readonly HashSet<MeshRenderer> _viewHidden = new();

        private void Draw(Terrain t, bool on)
        {
            t.drawHeightmap = on;
            t.drawTreesAndFoliage = on;
            foreach (var r in t.GetComponentsInChildren<MeshRenderer>(true))
            {
                if (!on && r.enabled) { r.enabled = false; _viewHidden.Add(r); }
                else if (on && _viewHidden.Remove(r)) r.enabled = true;
            }
        }
        public Terrain TerrainAt(int cx, int cz) => _built.TryGetValue((cx, cz), out var t) ? t : null;

        private void Awake() => _root = new GameObject("Terrain").transform;

        /// <summary>Creates the pool of terrains ahead (one a frame, while the title shows): creating a terrain is the
        /// expensive part of a chunk write (~90 ms in the editor against ~10 ms to re-fill a pooled one).</summary>
        public IEnumerator Prewarm(int count = -1)
        {
            if (count < 0) count = Policy.MaxBuilt;
            if (Details != null) yield return Details.Load();
            while (_pool.Count + _built.Count < count)
            {
                var t = ChunkTerrain.Create(_root, Layers, Details);
                ChunkTerrain.Hide(t);
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
                Spawner?.Hide(c.cx, c.cz);
                ChunkTerrain.Hide(t);   // stays active in the pool: activation is the expensive part of a write
                _pool.Push(t);
                Stitch(c);
            }
            foreach (var c in step.Forget) _prepared.Remove(c);
            foreach (var c in step.Prepare) _preparing[c] = ChunkTerrain.Prepare(World, c.cx, c.cz, Catalog);
            if (step.Build is { } b && Time.unscaledDeltaTime * 1000f <= SlowFrameMs)
            {
                var bw = Stopwatch.StartNew();
                var t = _pool.Count > 0 ? _pool.Pop() : ChunkTerrain.Create(_root, Layers, Details);
                ChunkTerrain.Apply(t, _prepared[b], Layers);
                if (WorldView.Underground) Draw(t, false);
                Holes(b, t);
                BuildMs.Add(bw.Elapsed.TotalMilliseconds);
                _built[b] = t;
                Stitch(b);
            }
            Props();
            if (Places != null && PlaceSpawner == null)
            {
                PlaceSpawner = gameObject.AddComponent<PlaceSpawner>();
                PlaceSpawner.World = World; PlaceSpawner.Places = Places; PlaceSpawner.Streamer = this;
            }
            sw.Stop();
            if (sw.Elapsed.TotalMilliseconds > MaxFrameWorkMs) MaxFrameWorkMs = sw.Elapsed.TotalMilliseconds;
        }

        /// <summary>Shows the props of built chunks near the focus and hides those of chunks the focus has left.</summary>
        private void Props()
        {
            if (Catalog == null) return;
            if (Spawner == null) { Spawner = gameObject.AddComponent<ScatterSpawner>(); Spawner.Catalog = Catalog; }
            var focus = WorldGrid.ChunkAt(World.Focus.x, World.Focus.z);
            foreach (var c in _built.Keys)
            {
                var d = StreamingPolicy.Distance(c, focus);
                if (d <= PropRadius && !Spawner.IsShown(c.cx, c.cz) && _prepared.TryGetValue(c, out var p)) Spawner.Show(c.cx, c.cz, p.Props);
                else if (d > PropRadius + 1 && Spawner.IsShown(c.cx, c.cz)) Spawner.Hide(c.cx, c.cz);
            }
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
