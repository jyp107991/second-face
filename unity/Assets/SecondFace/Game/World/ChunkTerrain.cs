using System.Threading.Tasks;
using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// One chunk's Unity terrain (BUILD_PLAN §6.A.3): heights and surface weights are computed off the main thread from
    /// Core (TerrainGen, TerrainPaint); the main thread only creates the TerrainData and writes heights and alphas once.
    /// At most four layers per tile (the chunk's dominant biome's palette).
    /// </summary>
    public static class ChunkTerrain
    {
        /// <summary>What the worker thread prepares for a chunk.</summary>
        public sealed class Prepared
        {
            public int Cx, Cz, Biome;
            public float[] Heights, Weights;
            public long Milliseconds;
        }

        /// <summary>Heights, the dominant biome and the role weights of a chunk, on a worker thread.</summary>
        public static Task<Prepared> Prepare(TerrainGen gen, ControlMap control, int cx, int cz) => Task.Run(() =>
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var heights = gen.Heights(cx, cz);
            var weights = TerrainPaint.Weights(control, heights, cx, cz);
            return new Prepared { Cx = cx, Cz = cz, Biome = TerrainPaint.DominantBiome(control, cx, cz), Heights = heights, Weights = weights, Milliseconds = sw.ElapsedMilliseconds };
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

        // reused across Apply calls on the main thread: no per-chunk garbage for the 66 K heights and 262 K weights
        private static float[,] _heights;
        private static float[,,] _alphas;

        /// <summary>Fills a (pooled) terrain with a prepared chunk on the main thread: one SetHeights, the dominant
        /// biome's four layers and one SetAlphamaps, then moves it into place.</summary>
        public static readonly System.Collections.Generic.Dictionary<string, double> LastApplyMs = new();

        public static void Apply(Terrain t, Prepared p, string[] biomes, BiomeLayerSet layers)
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
            var set = layers != null ? layers.LayersFor(biomes[p.Biome]) : null;
            if (set != null && set.Length == TerrainPaint.Roles && set[0] != null)
            {
                if (data.terrainLayers.Length != set.Length || !System.Linq.Enumerable.SequenceEqual(data.terrainLayers, set)) data.terrainLayers = set;
                Mark("layers");
                _alphas ??= new float[a, a, TerrainPaint.Roles];
                for (var j = 0; j < a; j++)
                    for (var i = 0; i < a; i++)
                    {
                        var k = (j * a + i) * TerrainPaint.Roles;
                        for (var r = 0; r < TerrainPaint.Roles; r++) _alphas[j, i, r] = p.Weights[k + r];
                    }
                Mark("convert alphas");
                data.SetAlphamaps(0, 0, _alphas);
                Mark("SetAlphamaps");
            }
            t.name = $"chunk_{p.Cx}_{p.Cz}";
            var (x0, z0) = WorldGrid.Origin(p.Cx, p.Cz);
            t.transform.position = new Vector3(x0, ControlMap.Floor, z0);
            t.drawHeightmap = true;   // pooled terrains stay active and only stop drawing: re-activating one cost ~50 ms
            if (!t.gameObject.activeSelf) t.gameObject.SetActive(true);
            Mark("show");
        }

        /// <summary>A new terrain for one prepared chunk (tests and tools; the streamer pools instead).</summary>
        public static Terrain Build(Prepared p, string[] biomes, BiomeLayerSet layers, Transform parent)
        {
            var t = Create(parent, layers);
            Apply(t, p, biomes, layers);
            return t;
        }
    }
}
