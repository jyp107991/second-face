using System.Threading.Tasks;
using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// One chunk's Unity terrain (BUILD_PLAN §6.A.3): heights and surface weights are computed off the main thread from
    /// Core (TerrainGen, TerrainPaint); the main thread only writes heights and alphas once. A chunk paints with the keys
    /// TerrainPaint picks for it: four inside a biome, up to eight on a biome border (the URP terrain draws layers five to
    /// eight in a second pass, so only border chunks pay for it).
    /// </summary>
    public static class ChunkTerrain
    {
        /// <summary>What the worker thread prepares for a chunk.</summary>
        public sealed class Prepared
        {
            public int Cx, Cz, Biome;
            public float[] Heights;
            public TerrainPaint.Result Paint;
            public long Milliseconds;
        }

        /// <summary>Heights, the dominant biome and the paint of a chunk, on a worker thread.</summary>
        public static Task<Prepared> Prepare(TerrainGen gen, ControlMap control, string[] biomes, int cx, int cz) => Task.Run(() =>
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var heights = gen.Heights(cx, cz);
            var paint = TerrainPaint.Paint(control, biomes, heights, cx, cz);
            return new Prepared { Cx = cx, Cz = cz, Biome = TerrainPaint.DominantBiome(control, cx, cz), Heights = heights, Paint = paint, Milliseconds = sw.ElapsedMilliseconds };
        });

        /// <summary>A pooled, empty chunk terrain: created once, re-filled by <see cref="Apply"/> as chunks come and go.</summary>
        public static Terrain Create(Transform parent, BiomeLayerSet layers)
        {
            var data = new TerrainData { heightmapResolution = TerrainGen.Resolution };
            data.size = new Vector3(WorldGrid.Chunk, ControlMap.Span, WorldGrid.Chunk);
            data.SetDetailResolution(TerrainPaint.AlphaResolution, 16);
            data.alphamapResolution = TerrainPaint.AlphaResolution;
            var go = Terrain.CreateTerrainGameObject(data);
            go.transform.SetParent(parent, false);
            var t = go.GetComponent<Terrain>();
            if (layers != null && layers.TerrainMaterial != null) t.materialTemplate = layers.TerrainMaterial;
            t.drawInstanced = true;
            t.heightmapPixelError = 5f;
            t.basemapDistance = 400f;
            return t;
        }

        // reused across Apply calls on the main thread: no per-chunk garbage for the 66 K heights and the weights (one
        // buffer per layer count, 4 to 8)
        private static float[,] _heights;
        private static readonly float[][,,] _alphas = new float[TerrainPaint.MaxLayers + 1][,,];

        public static readonly System.Collections.Generic.Dictionary<string, double> LastApplyMs = new();

        /// <summary>Fills a (pooled) terrain with a prepared chunk on the main thread: one SetHeights, the chunk's layers
        /// and one SetAlphamaps, then moves it into place.</summary>
        public static void Apply(Terrain t, Prepared p, BiomeLayerSet layers)
        {
            const int n = TerrainGen.Resolution, a = TerrainPaint.AlphaResolution;
            var sw = System.Diagnostics.Stopwatch.StartNew();
            void Mark(string k) { LastApplyMs[k] = sw.Elapsed.TotalMilliseconds; sw.Restart(); }
            var data = t.terrainData;
            _heights ??= new float[n, n];
            for (var j = 0; j < n; j++)
                for (var i = 0; i < n; i++)
                    _heights[j, i] = Mathf.Clamp01((p.Heights[j * n + i] - ControlMap.Floor) / ControlMap.Span);
            Mark("convert heights");
            data.SetHeights(0, 0, _heights);   // once per chunk (UNITY_PRACTICES §7.1)
            Mark("SetHeights");
            var keys = p.Paint.Keys;
            var set = new TerrainLayer[keys.Length];
            var complete = layers != null;
            for (var l = 0; l < keys.Length && complete; l++) complete = (set[l] = layers.Layer(keys[l])) != null;
            if (complete)
            {
                if (data.terrainLayers.Length != set.Length || !System.Linq.Enumerable.SequenceEqual(data.terrainLayers, set)) data.terrainLayers = set;
                Mark("layers");
                var L = keys.Length;
                var alphas = _alphas[L] ??= new float[a, a, L];
                var w = p.Paint.Weights;
                for (var j = 0; j < a; j++)
                    for (var i = 0; i < a; i++)
                    {
                        var k = (j * a + i) * L;
                        for (var r = 0; r < L; r++) alphas[j, i, r] = w[k + r];
                    }
                Mark("convert alphas");
                data.SetAlphamaps(0, 0, alphas);
                Mark("SetAlphamaps");
            }
            else Debug.LogWarning($"ChunkTerrain: no layer for one of {string.Join(", ", keys)} (Second Face/Build terrain layers)");
            t.name = $"chunk_{p.Cx}_{p.Cz}";
            var (x0, z0) = WorldGrid.Origin(p.Cx, p.Cz);
            t.transform.position = new Vector3(x0, ControlMap.Floor, z0);
            t.drawHeightmap = true;   // pooled terrains stay active and only stop drawing: re-activating one cost ~50 ms
            if (!t.gameObject.activeSelf) t.gameObject.SetActive(true);
            Mark("show");
        }

        /// <summary>A new terrain for one prepared chunk (tests and tools; the streamer pools instead).</summary>
        public static Terrain Build(Prepared p, BiomeLayerSet layers, Transform parent)
        {
            var t = Create(parent, layers);
            Apply(t, p, layers);
            return t;
        }
    }
}
