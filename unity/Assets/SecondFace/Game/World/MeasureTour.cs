using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SecondFace.Core.World;
using Unity.Profiling;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The world in the app before there is a game to play in it (step 23, for the owner's measurement, step 24): the
    /// world streamed round Shale with its sky, scatter, water and the town, and the game camera (28° FOV, 14–26 m off,
    /// pitched 40–58°) touring four views in a loop, <see cref="ViewSeconds"/> each, turning slowly: the main street, the
    /// square from the widest zoom, inside the saloon (the building open), and the town's edge with the scrub. Each view's
    /// frames after <see cref="SettleSeconds"/> are measured (mean, 95th percentile, worst; mean draw calls) and the
    /// last lap is shown on the <see cref="DebugOverlay"/>, so a screenshot of the overlay is the measurement. Replaced by
    /// the player's own camera and walk in step 25.
    /// </summary>
    public sealed class MeasureTour : MonoBehaviour
    {
        public WorldAssets Assets;
        public Camera Camera;
        public float ViewSeconds = 20f, SettleSeconds = 3f;
        public double Hour = 10.5;
        /// <summary>How long the world may take to come in round Shale before the tour starts anyway.</summary>
        public float LoadTimeout = 180f;

        public WorldService World { get; private set; }
        public WorldStreamer Streamer { get; private set; }
        /// <summary>The ground, the props and the town are in round Shale.</summary>
        public bool Ready { get; private set; }
        public string Status { get; private set; } = "raising the world…";
        public string Current { get; private set; }
        public int Laps { get; private set; }

        private sealed class View
        {
            public string Name;
            public Vector3 At;
            public float Pitch, Yaw, Distance, Spin;
            public readonly List<float> Frames = new();
            public double Draws;
            public string Result;
        }

        private readonly List<View> _views = new();
        private ProfilerRecorder _draws;

        private void OnEnable() => _draws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
        private void OnDisable() => _draws.Dispose();

        private IEnumerator Start()
        {
            if (Assets == null || !Assets.Complete) { Status = "world assets missing (Second Face/Build world assets)"; yield break; }
            World = new GameObject("World").AddComponent<WorldService>();
            yield return World.Load();
            if (!World.Ready) { Status = "world failed: " + World.Error; yield break; }
            Streamer = new GameObject("Streamer").AddComponent<WorldStreamer>();
            Streamer.World = World; Streamer.Layers = Assets.Layers; Streamer.Catalog = Assets.Catalog; Streamer.Details = Assets.Details; Streamer.Places = Assets.Places;
            yield return Streamer.Prewarm();

            var skyGo = new GameObject("Sky");
            var clock = skyGo.AddComponent<TimeService>(); clock.Paused = true; clock.SetHour(Hour);
            var sun = FindAnyObjectByType<Light>();
            if (sun != null && sun.type == LightType.Directional) sun.shadows = LightShadows.Soft; else sun = null;
            var sky = skyGo.AddComponent<SkyController>();
            sky.Sun = sun; sky.Clock = clock; sky.World = World; sky.Profile = Assets.Sky; sky.Force = WeatherKind.Clear;

            if (Camera == null) Camera = Camera.main;
            Camera.orthographic = false; Camera.fieldOfView = 28f; Camera.nearClipPlane = 0.3f; Camera.farClipPlane = 3000f;
            Camera.clearFlags = CameraClearFlags.Skybox;

            var centre = World.PlaceCentre("shale");
            World.Focus = centre;
            Look(centre, 45f, 30f, 26f);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < LoadTimeout)
            {
                var ground = WorldGrid.Around(centre.x, centre.z, 1).All(c => Streamer.IsBuilt(c.cx, c.cz));
                var town = Streamer.PlaceSpawner != null && Streamer.PlaceSpawner.IsShown("shale");
                if (ground && town && Streamer.Spawner != null && Streamer.Spawner.Idle) break;
                Status = $"raising the world… {Streamer.Built.Count} chunks{(town ? ", Shale" : "")}";
                yield return null;
            }
            var bar = centre;
            var shale = Streamer.PlaceSpawner?.Instance("shale");
            if (shale != null)
                foreach (var m in shale.GetComponentsInChildren<PlaceMarker>())
                    if (m.Kind == "spot" && m.Id == "bar") bar = m.transform.position;
            var edge = centre + new Vector3(70f, 0, 45f);
            edge.y = Ground(edge, centre.y);
            _views.Add(new View { Name = "street", At = centre + new Vector3(-6f, 0, 4f), Pitch = 45f, Yaw = 35f, Distance = 26f, Spin = 4f });
            _views.Add(new View { Name = "square", At = centre + new Vector3(1f, 0, 12f), Pitch = 40f, Yaw = 215f, Distance = 26f, Spin = 4f });
            _views.Add(new View { Name = "saloon", At = bar, Pitch = 58f, Yaw = 25f, Distance = 14f, Spin = 2f });
            _views.Add(new View { Name = "edge", At = edge, Pitch = 40f, Yaw = 250f, Distance = 26f, Spin = 4f });
            Ready = true;
            Status = null;
            while (true)
            {
                foreach (var v in _views)
                {
                    Current = v.Name;
                    World.Focus = v.At;   // inside the saloon the building opens
                    v.Frames.Clear(); v.Draws = 0;
                    var t = 0f;
                    while (t < ViewSeconds)
                    {
                        Look(v.At, v.Pitch, v.Yaw + v.Spin * t, v.Distance);
                        yield return null;
                        t += Time.unscaledDeltaTime;
                        if (t < SettleSeconds) continue;
                        v.Frames.Add(Time.unscaledDeltaTime * 1000f);
                        if (_draws.Valid) v.Draws += _draws.LastValue;
                    }
                    v.Result = Summary(v);
                }
                Laps++;
            }
        }

        private float Ground(Vector3 p, float fallback)
        {
            var (cx, cz) = WorldGrid.ChunkAt(p.x, p.z);
            var t = Streamer.TerrainAt(cx, cz);
            return t != null ? t.SampleHeight(p) + t.transform.position.y : fallback;
        }

        private void Look(Vector3 at, float pitch, float yaw, float distance)
        {
            Camera.transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            Camera.transform.position = at + Vector3.up * 1.2f - Camera.transform.rotation * Vector3.forward * distance;
        }

        private static string Summary(View v)
        {
            if (v.Frames.Count == 0) return "no frames";
            var sorted = v.Frames.OrderBy(f => f).ToList();
            var mean = sorted.Average();
            var p95 = sorted[Mathf.Min(sorted.Count - 1, (int)(sorted.Count * 0.95f))];
            var draws = v.Draws > 0 ? $" · draws {v.Draws / v.Frames.Count:0}" : "";
            return $"{mean:0.0} ms mean ({1000f / mean:0} fps) · 95 % {p95:0.0} · worst {sorted[^1]:0.0}{draws}";
        }

        /// <summary>The world line for the overlay.</summary>
        public string WorldLine()
        {
            if (Streamer == null) return Status;
            var props = Streamer.Spawner != null ? Streamer.Spawner.LiveCount : 0;
            var places = Streamer.PlaceSpawner != null ? Streamer.PlaceSpawner.LiveCount : 0;
            return $"chunks {Streamer.Built.Count} · props {props} · places {places} · view {Current ?? "-"}{(Status != null ? " · " + Status : "")}";
        }

        /// <summary>The last lap's results, one line per view, for the overlay (the screenshot the owner sends).</summary>
        public string Report()
        {
            if (_views.Count == 0 || _views.All(v => v.Result == null)) return null;
            var sb = new StringBuilder($"tour lap {Laps} ({ViewSeconds:0} s a view, after {SettleSeconds:0} s):");
            foreach (var v in _views) sb.Append($"\n  {v.Name,-7} {v.Result ?? "…"}");
            return sb.ToString();
        }
    }
}
