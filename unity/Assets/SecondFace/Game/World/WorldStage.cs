using System.Collections;
using System.Linq;
using SecondFace.Core.World;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The world raised for the app (step 23, 25): the world's data, the streamer with the terrain, props, small scatter,
    /// water and places, the sky on a paused clock, and the camera's lens set to the game camera's (FOV 28°). The
    /// measuring tour and the walkabout both stand on it.
    /// </summary>
    public sealed class WorldStage : MonoBehaviour
    {
        public WorldAssets Assets;
        public Camera Camera;
        public double Hour = 10.5;

        public WorldService World { get; private set; }
        public WorldStreamer Streamer { get; private set; }
        public TimeService Clock { get; private set; }
        public SkyController Sky { get; private set; }
        /// <summary>The world's data loaded and the streamer, sky and camera made.</summary>
        public bool Raised { get; private set; }
        public string Status { get; private set; } = "raising the world…";

        public IEnumerator Raise()
        {
            if (Assets == null || !Assets.Complete) { Status = "world assets missing (Second Face/Build world assets)"; yield break; }
            World = new GameObject("World").AddComponent<WorldService>();
            yield return World.Load();
            if (!World.Ready) { Status = "world failed: " + World.Error; yield break; }
            Streamer = new GameObject("Streamer").AddComponent<WorldStreamer>();
            Streamer.World = World; Streamer.Layers = Assets.Layers; Streamer.Catalog = Assets.Catalog; Streamer.Details = Assets.Details; Streamer.Places = Assets.Places;
            yield return Streamer.Prewarm();

            var skyGo = new GameObject("Sky");
            Clock = skyGo.AddComponent<TimeService>(); Clock.Paused = true; Clock.SetHour(Hour);
            // the world's sun: the scene's own directional light, never the studio's (portraits light their faces with
            // lights of their own, off between pictures, on their own layer: taken for the sun, the sky turned a dead
            // light while the scene's stayed at noon round the clock); a second directional light in the scene is put
            // out (two suns light the night as the day)
            Light sun = null;
            foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None))
            {
                if (l.type != LightType.Directional || !l.enabled || !l.gameObject.activeInHierarchy) continue;
                if (l.cullingMask == 1 << SecondFace.Game.People.Studio.Layer) continue;
                if (sun == null) sun = l; else l.enabled = false;
            }
            if (sun != null) sun.shadows = LightShadows.Soft;
            Sky = skyGo.AddComponent<SkyController>();
            Sky.Sun = sun; Sky.Clock = Clock; Sky.World = World; Sky.Profile = Assets.Sky; Sky.Force = WeatherKind.Clear;

            if (Camera == null) Camera = Camera.main;
            Camera.orthographic = false; Camera.fieldOfView = 28f; Camera.nearClipPlane = 0.3f; Camera.farClipPlane = 3000f;
            Camera.clearFlags = CameraClearFlags.Skybox;
            Raised = true;
            Status = null;
        }

        /// <summary>Waits until the ground round a point (3 × 3 chunks), a place if named, and the props are in, or the
        /// timeout runs out.</summary>
        public IEnumerator WaitAround(Vector3 centre, string place, float timeout)
        {
            World.Focus = centre;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < timeout)
            {
                var ground = WorldGrid.Around(centre.x, centre.z, 1).All(c => Streamer.IsBuilt(c.cx, c.cz));
                var town = place == null || (Streamer.PlaceSpawner != null && Streamer.PlaceSpawner.IsShown(place));
                if (ground && town && Streamer.Spawner != null && Streamer.Spawner.Idle) break;
                Status = $"raising the world… {Streamer.Built.Count} chunks{(town && place != null ? ", " + place : "")}";
                yield return null;
            }
            Status = null;
        }

        /// <summary>The ground's height at a point (the terrain's; the fallback where no chunk is built).</summary>
        public float Ground(Vector3 p, float fallback)
        {
            var (cx, cz) = WorldGrid.ChunkAt(p.x, p.z);
            var t = Streamer != null ? Streamer.TerrainAt(cx, cz) : null;
            return t != null ? t.SampleHeight(p) + t.transform.position.y : fallback;
        }

        /// <summary>A marker of a shown place (a spawn, a post, a spot), or null.</summary>
        public PlaceMarker Marker(string place, string kind, string id = null)
        {
            var go = Streamer?.PlaceSpawner?.Instance(place);
            if (go == null) return null;
            foreach (var m in go.GetComponentsInChildren<PlaceMarker>())
                if (m.Kind == kind && (id == null || m.Id == id)) return m;
            return null;
        }

        /// <summary>The world line for the debug overlay.</summary>
        public string Line()
        {
            if (Streamer == null) return Status;
            var props = Streamer.Spawner != null ? Streamer.Spawner.LiveCount : 0;
            var places = Streamer.PlaceSpawner != null ? Streamer.PlaceSpawner.LiveCount : 0;
            return $"chunks {Streamer.Built.Count} · props {props} · places {places}{(Status != null ? " · " + Status : "")}";
        }
    }
}
