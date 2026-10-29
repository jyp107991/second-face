using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The runtime terrain (BUILD_PLAN §6.A.3): the four chunks round Shale built as the game builds them (heights and
    /// paint on worker threads, one write on the main thread), checked for seams and for Shale's level pad, and captured
    /// from the game camera and from far (`world_chunks_iso`, `world_chunks_wide`); then a Teeth chunk (`world_teeth_chunk`).
    /// </summary>
    public class WorldTerrainTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build terrain layers");
#endif
        }

        /// <summary>Clears what a test made (cameras, lights, terrains, the world): a camera left behind stays
        /// Camera.main and every later capture shows its view.</summary>
        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) Object.Destroy(l.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            yield return null;
        }

        private static BiomeLayerSet Layers()
        {
#if UNITY_EDITOR
            return AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
#else
            return null;
#endif
        }

        private static void Light()
        {
            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1f, 0.95f, 0.85f); sun.intensity = 2.3f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(38f, 60f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.66f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.66f, 0.6f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.22f, 0.16f);
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.ExponentialSquared; RenderSettings.fogColor = new Color(0.8f, 0.78f, 0.72f); RenderSettings.fogDensity = 0.0012f;
        }

        private static IEnumerator BuildChunks(WorldService world, IEnumerable<(int cx, int cz)> chunks, List<Terrain> into, List<long> times)
        {
            var root = new GameObject("Chunks").transform;
            foreach (var (cx, cz) in chunks)
            {
                var task = ChunkTerrain.Prepare(world, cx, cz);
                while (!task.IsCompleted) yield return null;
                Assert.That(task.Exception, Is.Null, task.Exception?.ToString());
                times.Add(task.Result.Milliseconds);
                into.Add(ChunkTerrain.Build(task.Result, Layers(), root));
            }
        }

        /// <summary>Neighbours for four terrains built in the order (0,0), (1,0), (0,1), (1,1): without them each terrain
        /// shades its edge alone and a line shows where two meet.</summary>
        private static void Stitch(List<Terrain> t)
        {
            t[0].SetNeighbors(null, t[2], t[1], null);
            t[1].SetNeighbors(t[0], t[3], null, null);
            t[2].SetNeighbors(null, null, t[3], t[0]);
            t[3].SetNeighbors(t[2], null, null, t[1]);
        }

        [UnityTest, Timeout(300000)]
        public IEnumerator FourChunksRoundShaleMeetAndShaleStandsOnItsPad()
        {
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            Light();
            var shale = world.PlaceCentre("shale");
            var (ox, oz) = WorldGrid.ChunkAt(shale.x - 256, shale.z - 256);
            var chunks = new[] { (ox, oz), (ox + 1, oz), (ox, oz + 1), (ox + 1, oz + 1) };
            var terrains = new List<Terrain>(); var times = new List<long>();
            yield return BuildChunks(world, chunks, terrains, times);
            Debug.Log($"WorldTerrainTests: chunk heights and paint in {string.Join(", ", times)} ms");
            Terrain At(int cx, int cz) => terrains[System.Array.IndexOf(chunks, (cx, cz))];
            At(ox, oz).SetNeighbors(null, At(ox, oz + 1), At(ox + 1, oz), null);
            At(ox + 1, oz).SetNeighbors(At(ox, oz), At(ox + 1, oz + 1), null, null);
            At(ox, oz + 1).SetNeighbors(null, null, At(ox + 1, oz + 1), At(ox, oz));
            At(ox + 1, oz + 1).SetNeighbors(At(ox, oz + 1), null, null, At(ox + 1, oz));
            // the shared edges: the same height read from either side
            var (ex, _) = WorldGrid.Origin(ox + 1, oz);
            for (var k = 0; k < 20; k++)
            {
                var z = WorldGrid.Origin(ox, oz).z + k * 25.3f;
                var p = new Vector3(ex, 0, z);
                Assert.That(At(ox + 1, oz).SampleHeight(p + Vector3.right * 0.01f), Is.EqualTo(At(ox, oz).SampleHeight(p - Vector3.right * 0.01f)).Within(0.05f), $"seam at z {z}");
            }
            var under = terrains.First(t => { var o = t.transform.position; return shale.x >= o.x && shale.x < o.x + 512 && shale.z >= o.z && shale.z < o.z + 512; });
            Assert.That(under.SampleHeight(shale) + under.transform.position.y, Is.EqualTo(shale.y).Within(0.05f), "Shale's pad is level at its height");
            Assert.That(times.Max(), Is.LessThan(5000), "a chunk is prepared while the player walks");
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 4000f;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.62f, 0.72f, 0.86f);
            cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
            cam.transform.position = shale + new Vector3(60, 0, 40) - cam.transform.rotation * Vector3.forward * 40f;
            yield return null;
            yield return ScreenshotTests.Capture("world_chunks_iso", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(32f, 30f, 0f);
            cam.transform.position = shale - cam.transform.rotation * Vector3.forward * 700f;
            yield return null;
            yield return ScreenshotTests.Capture("world_chunks_wide", 1920, 1080);
            foreach (var t in terrains) Object.Destroy(t.gameObject);
            // a Teeth chunk: mountains, rock on the slopes
            var teeth = new List<Terrain>();
            yield return BuildChunks(world, new[] { WorldGrid.ChunkAt(21000, 11000) }, teeth, times);
            var c = teeth[0].transform.position + new Vector3(256, 0, 256);
            c.y = teeth[0].SampleHeight(c) + teeth[0].transform.position.y;
            cam.transform.rotation = Quaternion.Euler(35f, 30f, 0f);
            cam.transform.position = c - cam.transform.rotation * Vector3.forward * 420f;
            yield return null;
            yield return ScreenshotTests.Capture("world_teeth_chunk", 1920, 1080);
        }

        /// <summary>A view of a way: the middle of its middle segment.</summary>
        private static (string, float, float) Along(string name, WayInfo way)
        {
            var i = way.Points.Count / 2 - 1;
            return (name, (way.Points[i][0] + way.Points[i + 1][0]) / 2, (way.Points[i][1] + way.Points[i + 1][1]) / 2);
        }

        /// <summary>The ground's surfaces (§6.A.3, P3.2), each from the game camera (`_near`, 45 m) and from mid range
        /// (`_mid`, 180 m): the sallow by Shale, the Teeth, the drowned shore, a sallow / rail-corridor border where the
        /// two palettes blend across the chunk edge (no seam), and a road and a track with their surfaces (step 17b).</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator SurfacesOfTheSallowTheTeethTheShoreAndABorder()
        {
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            Light();
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 4000f;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.62f, 0.72f, 0.86f);
            var shale = world.PlaceCentre("shale");
            var views = new (string name, float x, float z)[]
            {
                ("world_sallow", shale.x + 220f, shale.z + 60f),
                ("world_teeth", 21000f, 11000f),
                ("world_shore", 4224f, 6464f),
                ("world_border", 30 * WorldGrid.Chunk, 13 * WorldGrid.Chunk + 256f),
                Along("world_road", world.Layout.Roads.First(w => w.Kind == "road")),
                Along("world_track", world.Layout.Roads.First(w => w.Kind == "track")),
            };
            var times = new List<long>();
            foreach (var (name, x, z) in views)
            {
                var (ox, oz) = WorldGrid.ChunkAt(x - 256, z - 256);
                var terrains = new List<Terrain>();
                yield return BuildChunks(world, new[] { (ox, oz), (ox + 1, oz), (ox, oz + 1), (ox + 1, oz + 1) }, terrains, times);
                Stitch(terrains);
                Debug.Log($"WorldTerrainTests: {name}: layers {string.Join(" | ", terrains.Select(t => string.Join(",", t.terrainData.terrainLayers.Select(l => l.name))))}");
                var under = terrains.First(t => { var o = t.transform.position; return x >= o.x && x < o.x + 512 && z >= o.z && z < o.z + 512; });
                var target = new Vector3(x, 0, z);
                target.y = under.SampleHeight(target) + under.transform.position.y;
                cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
                cam.transform.position = target - cam.transform.rotation * Vector3.forward * 45f;
                yield return null;
                yield return ScreenshotTests.Capture(name + "_near", 1920, 1080);
                cam.transform.rotation = Quaternion.Euler(40f, 30f, 0f);
                cam.transform.position = target - cam.transform.rotation * Vector3.forward * 180f;
                yield return null;
                yield return ScreenshotTests.Capture(name + "_mid", 1920, 1080);
                foreach (var t in terrains) Object.Destroy(t.gameObject);
                yield return null;
            }
            Debug.Log($"WorldTerrainTests: surfaces prepared in {string.Join(", ", times)} ms");
        }
    }
}
