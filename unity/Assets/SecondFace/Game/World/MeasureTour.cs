using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Unity.Profiling;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The measuring tour (step 23, for the owner's measurement, step 24): on the raised <see cref="WorldStage"/>, the game
    /// camera (28° FOV, 14–26 m off, pitched 40–58°) tours four views of Shale in a loop, <see cref="ViewSeconds"/> each,
    /// turning slowly: the main street and the square from the widest zoom, inside the saloon (the building open), and
    /// the town's edge with the scrub. Each view's frames after <see cref="SettleSeconds"/> are measured (mean, 95th
    /// percentile, worst; mean draw calls) and the last lap is shown on the <see cref="DebugOverlay"/>, so a screenshot of
    /// the overlay is the measurement. Run from the overlay's button while walking (step 25), or on its own.
    /// </summary>
    public sealed class MeasureTour : MonoBehaviour
    {
        public WorldStage Stage;
        public float ViewSeconds = 20f, SettleSeconds = 3f;
        /// <summary>How long the world may take to come in round Shale before the tour starts anyway.</summary>
        public float LoadTimeout = 180f;

        /// <summary>The ground, the props and the town are in round Shale and the tour is running.</summary>
        public bool Ready { get; private set; }
        public string Status => Stage != null ? Stage.Status : "no stage";
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
        private void OnDisable() { _draws.Dispose(); Ready = false; Current = null; }

        private IEnumerator Start()
        {
            if (Stage == null) yield break;
            if (!Stage.Raised) yield return Stage.Raise();
            if (!Stage.Raised) yield break;
            var world = Stage.World;
            var centre = world.PlaceCentre("shale");
            Look(centre, 45f, 30f, 26f);
            yield return Stage.WaitAround(centre, "shale", LoadTimeout);
            var bar = Stage.Marker("shale", "spot", "bar")?.transform.position ?? centre;
            var edge = centre + new Vector3(70f, 0, 45f);
            edge.y = Stage.Ground(edge, centre.y);
            _views.Clear();
            _views.Add(new View { Name = "street", At = centre + new Vector3(-6f, 0, 4f), Pitch = 45f, Yaw = 35f, Distance = 26f, Spin = 4f });
            _views.Add(new View { Name = "square", At = centre + new Vector3(1f, 0, 12f), Pitch = 40f, Yaw = 215f, Distance = 26f, Spin = 4f });
            _views.Add(new View { Name = "saloon", At = bar, Pitch = 58f, Yaw = 25f, Distance = 14f, Spin = 2f });
            _views.Add(new View { Name = "edge", At = edge, Pitch = 40f, Yaw = 250f, Distance = 26f, Spin = 4f });
            Ready = true;
            while (true)
            {
                foreach (var v in _views)
                {
                    Current = v.Name;
                    world.Focus = v.At;   // inside the saloon the building opens
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

        private void Look(Vector3 at, float pitch, float yaw, float distance)
        {
            var cam = Stage.Camera.transform;
            cam.rotation = Quaternion.Euler(pitch, yaw, 0f);
            cam.position = at + Vector3.up * 1.2f - cam.rotation * Vector3.forward * distance;
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
        public string WorldLine() => Stage == null ? null : Stage.Line() + $" · view {Current ?? "-"}";

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
