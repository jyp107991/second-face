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

        /// <summary>Builds the chunk's terrain on the main thread from what <see cref="Prepare"/> made.</summary>
        public static Terrain Build(Prepared p, string[] biomes, BiomeLayerSet layers, Transform parent)
        {
            const int n = TerrainGen.Resolution, a = TerrainPaint.AlphaResolution;
            var data = new TerrainData { heightmapResolution = n };
            data.size = new Vector3(WorldGrid.Chunk, ControlMap.Span, WorldGrid.Chunk);
            data.SetDetailResolution(a, 16);
            data.alphamapResolution = a;
            var h = new float[n, n];
            for (var j = 0; j < n; j++)
                for (var i = 0; i < n; i++)
                    h[j, i] = Mathf.Clamp01((p.Heights[j * n + i] - ControlMap.Floor) / ControlMap.Span);
            data.SetHeights(0, 0, h);   // once per chunk (UNITY_PRACTICES §7.1)
            var set = layers != null ? layers.LayersFor(biomes[p.Biome]) : null;
            if (set != null && set.Length == TerrainPaint.Roles && set[0] != null)
            {
                data.terrainLayers = set;
                var alphas = new float[a, a, TerrainPaint.Roles];
                for (var j = 0; j < a; j++)
                    for (var i = 0; i < a; i++)
                        for (var r = 0; r < TerrainPaint.Roles; r++)
                            alphas[j, i, r] = p.Weights[(j * a + i) * TerrainPaint.Roles + r];
                data.SetAlphamaps(0, 0, alphas);
            }
            var go = Terrain.CreateTerrainGameObject(data);
            go.name = $"chunk_{p.Cx}_{p.Cz}";
            go.transform.SetParent(parent, false);
            var (x0, z0) = WorldGrid.Origin(p.Cx, p.Cz);
            go.transform.position = new Vector3(x0, ControlMap.Floor, z0);
            var t = go.GetComponent<Terrain>();
            if (layers != null && layers.TerrainMaterial != null) t.materialTemplate = layers.TerrainMaterial;
            t.drawInstanced = true;
            t.heightmapPixelError = 5f;
            t.basemapDistance = 400f;
            return t;
        }
    }
}
