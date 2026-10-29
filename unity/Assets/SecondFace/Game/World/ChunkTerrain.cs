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
            public System.Collections.Generic.List<RoadStrips.Strip> Roads;
            /// <summary>The chunk's props (null when no catalog was given): placed by <see cref="ScatterSpawner"/>.</summary>
            public System.Collections.Generic.List<PropPlacement> Props;
            /// <summary>The chunk's small scatter per detail layer (null without details).</summary>
            public WorldDetails.Result Details;
            public long Milliseconds;
        }

        /// <summary>Heights, the dominant biome, the paint and the road strips of a chunk, on a worker thread.</summary>
        public static Task<Prepared> Prepare(TerrainGen gen, ControlMap control, string[] biomes, RoadStrips roads, WorldScatter scatter, System.Func<string, int> variants, int cx, int cz, WorldDetails details = null) => Task.Run(() =>
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var heights = gen.Heights(cx, cz);
            var paint = TerrainPaint.Paint(control, biomes, heights, cx, cz);
            var strips = roads?.Build(cx, cz, heights);
            var props = scatter != null && variants != null ? scatter.Props(cx, cz, heights, biomes, variants) : null;
            var small = details?.Build(cx, cz, heights, biomes);
            return new Prepared { Cx = cx, Cz = cz, Biome = TerrainPaint.DominantBiome(control, cx, cz), Heights = heights, Paint = paint, Roads = strips, Props = props, Details = small, Milliseconds = sw.ElapsedMilliseconds };
        });

        /// <summary>A chunk of the loaded world; with a catalog its props are placed too.</summary>
        public static Task<Prepared> Prepare(WorldService world, int cx, int cz, ScatterCatalog catalog = null) =>
            Prepare(world.Gen, world.Control, world.Layout.Biomes, world.Roads, world.Scatter, catalog != null ? catalog.Variants : null, cx, cz, world.Details);

        /// <summary>A pooled, empty chunk terrain: created once, re-filled by <see cref="Apply"/> as chunks come and go.</summary>
        public static Terrain Create(Transform parent, BiomeLayerSet layers, DetailSet details = null)
        {
            var data = new TerrainData { heightmapResolution = TerrainGen.Resolution };
            data.size = new Vector3(WorldGrid.Chunk, ControlMap.Span, WorldGrid.Chunk);
            data.SetDetailResolution(WorldDetails.Resolution, 16);
            data.alphamapResolution = TerrainPaint.AlphaResolution;
            if (details?.Prototypes != null && details.Prototypes.Length == WorldDetails.Keys.Length)
            {
                data.SetDetailScatterMode(DetailScatterMode.InstanceCountMode);   // a cell's value is how many stand in it
                data.detailPrototypes = details.Prototypes;
            }
            var go = Terrain.CreateTerrainGameObject(data);
            go.transform.SetParent(parent, false);
            var t = go.GetComponent<Terrain>();
            if (layers != null && layers.TerrainMaterial != null) t.materialTemplate = layers.TerrainMaterial;
            t.drawInstanced = true;
            t.heightmapPixelError = 5f;
            t.basemapDistance = 400f;
            t.detailObjectDistance = DetailDistance;
            t.detailObjectDensity = 1f;
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
            ApplyRoads(t, p, layers);
            Mark("roads");
            ApplyDetails(t, p);
            Mark("details");
            t.name = $"chunk_{p.Cx}_{p.Cz}";
            var (x0, z0) = WorldGrid.Origin(p.Cx, p.Cz);
            t.transform.position = new Vector3(x0, ControlMap.Floor, z0);
            t.drawHeightmap = true;   // pooled terrains stay active and only stop drawing: re-activating one cost ~50 ms
            t.drawTreesAndFoliage = true;
            if (!t.gameObject.activeSelf) t.gameObject.SetActive(true);
            Mark("show");
        }

        // reused across ApplyRoads calls (main thread)
        private static readonly System.Collections.Generic.List<Vector3> _rv = new();
        private static readonly System.Collections.Generic.List<Vector2> _ruv = new();
        private static readonly System.Collections.Generic.List<Color32> _rc = new();

        /// <summary>The chunk's road strips as child meshes of its terrain, one per surface, pooled with the terrain:
        /// a surface the chunk lacks keeps its object with the renderer off.</summary>
        private static void ApplyRoads(Terrain t, Prepared p, BiomeLayerSet layers)
        {
            var root = t.transform;
            foreach (Transform child in root) if (child.name.StartsWith("road_")) child.GetComponent<MeshRenderer>().enabled = false;
            if (p.Roads == null || layers == null) return;
            foreach (var s in p.Roads)
            {
                var mat = layers.Surface(s.Surface);
                if (mat == null) continue;
                var name = "road_" + s.Surface;
                var go = root.Find(name)?.gameObject;
                if (go == null)
                {
                    go = new GameObject(name);
                    go.transform.SetParent(root, false);
                    go.transform.localPosition = new Vector3(0, -ControlMap.Floor, 0);   // strip heights are metres above sea level
                    go.AddComponent<MeshFilter>().sharedMesh = new Mesh { name = name };
                    var r = go.AddComponent<MeshRenderer>();
                    r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                }
                var mesh = go.GetComponent<MeshFilter>().sharedMesh;
                _rv.Clear(); _ruv.Clear(); _rc.Clear();
                for (var v = 0; v < s.VertexCount; v++)
                {
                    _rv.Add(new Vector3(s.Positions[v * 3], s.Positions[v * 3 + 1], s.Positions[v * 3 + 2]));
                    _ruv.Add(new Vector2(s.Uvs[v * 2], s.Uvs[v * 2 + 1]));
                    _rc.Add(new Color32(255, 255, 255, (byte)(s.Alphas[v] * 255)));
                }
                mesh.Clear();
                mesh.indexFormat = s.VertexCount > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16;
                mesh.SetVertices(_rv);
                mesh.SetUVs(0, _ruv);
                mesh.SetColors(_rc);
                mesh.SetTriangles(s.Triangles, 0);
                mesh.RecalculateNormals();
                mesh.RecalculateTangents();
                mesh.RecalculateBounds();
                var mr = go.GetComponent<MeshRenderer>();
                mr.sharedMaterial = mat;
                mr.enabled = true;
            }
        }

        /// <summary>Cuts the terrain away over world rectangles (a tunnel's mouth): hole texels are 2 m, a texel is cut
        /// when its centre lies in a rectangle. With none, the terrain is whole again.</summary>
        public static void SetHoles(Terrain t, float x0, float z0, System.Collections.Generic.IReadOnlyList<Rect> rects)
        {
            var td = t.terrainData;
            var res = td.holesResolution;
            var cell = WorldGrid.Chunk / res;
            var solid = new bool[res, res];
            for (var j = 0; j < res; j++)
                for (var i = 0; i < res; i++)
                {
                    var p = new Vector2(x0 + (i + 0.5f) * cell, z0 + (j + 0.5f) * cell);
                    var hole = false;
                    for (var k = 0; k < rects.Count && !hole; k++) hole = rects[k].Contains(p);
                    solid[j, i] = !hole;
                }
            td.SetHoles(0, 0, solid);
        }

        /// <summary>How far the terrain draws its small scatter, metres: the top of the game camera's frame is ~90–140 m
        /// off at its zooms (at 75 m the scrub ended in a line across the frame); the plants dissolve out over the last
        /// 25 m (SecondFace/Foliage).</summary>
        public const float DetailDistance = 150f;

        private static int[,] _detail;
        private static int[,] _zero;
        // the detail layers each (pooled) terrain holds now, so a reused terrain clears what its last chunk wrote
        private static readonly System.Collections.Generic.Dictionary<TerrainData, System.Collections.Generic.List<int>> _detailLayers = new();

        private static void ApplyDetails(Terrain t, Prepared p)
        {
            var data = t.terrainData;
            if (data.detailPrototypes.Length != WorldDetails.Keys.Length) return;
            const int n = WorldDetails.Resolution;
            _detail ??= new int[n, n];
            _zero ??= new int[n, n];
            var now = p.Details?.Layers ?? new System.Collections.Generic.List<int>();
            if (_detailLayers.TryGetValue(data, out var before))
                foreach (var k in before) if (!now.Contains(k)) data.SetDetailLayer(0, 0, k, _zero);
            if (p.Details != null)
                for (var l = 0; l < p.Details.Layers.Count; l++)
                {
                    var counts = p.Details.Counts[l];
                    for (var j = 0; j < n; j++)
                        for (var i = 0; i < n; i++)
                            _detail[j, i] = counts[j * n + i];
                    data.SetDetailLayer(0, 0, p.Details.Layers[l], _detail);
                }
            _detailLayers[data] = new System.Collections.Generic.List<int>(now);
        }

        /// <summary>Stops a pooled terrain drawing (the ground and its roads) without deactivating it.</summary>
        public static void Hide(Terrain t)
        {
            t.drawHeightmap = false;
            t.drawTreesAndFoliage = false;
            foreach (Transform child in t.transform) if (child.name.StartsWith("road_")) child.GetComponent<MeshRenderer>().enabled = false;
        }

        /// <summary>A new terrain for one prepared chunk (tests and tools; the streamer pools instead).</summary>
        public static Terrain Build(Prepared p, BiomeLayerSet layers, Transform parent, DetailSet details = null)
        {
            var t = Create(parent, layers, details);
            Apply(t, p, layers);
            return t;
        }
    }
}
