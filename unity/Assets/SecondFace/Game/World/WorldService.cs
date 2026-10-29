using System.Collections;
using System.Collections.Generic;
using System.IO;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.Networking;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The one world (BUILD_PLAN §6.A): loads the control map and the layout written by tools/unity/world.py from
    /// StreamingAssets/world, and answers which chunks the focus point wants. Terrain generation (§6.A.3) and the
    /// streaming policy (§6.A.4) build on it; until they exist it only knows the world.
    /// </summary>
    public sealed class WorldService : MonoBehaviour
    {
        /// <summary>Chunks loaded around the focus (5 × 5 at radius 2: §6.A.4).</summary>
        public int LoadRadius = 2;

        public ControlMap Control { get; private set; }
        public StyleMap Style { get; private set; }
        public WorldLayout Layout { get; private set; }
        /// <summary>The ground generator over the loaded world (thread-safe to call from workers).</summary>
        public TerrainGen Gen { get; private set; }
        /// <summary>The road surfaces over the loaded world (thread-safe to call from workers).</summary>
        public RoadStrips Roads { get; private set; }
        /// <summary>The props over the loaded world (thread-safe to call from workers).</summary>
        public WorldScatter Scatter { get; private set; }
        /// <summary>The small scatter over the loaded world (thread-safe to call from workers).</summary>
        public WorldDetails Details { get; private set; }
        public bool Ready => Control != null && Layout != null;
        public string Error { get; private set; }

        /// <summary>The point the world streams around: the camera's look-at point, in world metres.</summary>
        public Vector3 Focus;

        private IEnumerator Start() => Load();

        /// <summary>Reads the three world files; on Android they live inside the APK, where only UnityWebRequest reads.</summary>
        public IEnumerator Load()
        {
            byte[] control = null, style = null; string places = null, roads = null;
            yield return Read("control.bin", b => control = b);
            yield return Read("style.bin", b => style = b);
            yield return Read("places.json", b => places = System.Text.Encoding.UTF8.GetString(b));
            yield return Read("roads.json", b => roads = System.Text.Encoding.UTF8.GetString(b));
            if (Error != null) { Debug.LogError($"WorldService: {Error}"); yield break; }
            Control = ControlMap.Read(control);
            Style = StyleMap.Read(style);
            Layout = WorldLayout.Read(places, roads);
            Gen = new TerrainGen(Control, Layout, Style);
            Roads = new RoadStrips(Layout);
            Scatter = new WorldScatter(Control, Layout);
            Details = new WorldDetails(Control, Layout);
            Debug.Log($"WorldService: control {Control.Width}x{Control.Height} at {Control.MetresPerTexel} m, {Layout.Places.Count} places, {Layout.Roads.Count} roads");
        }

        private IEnumerator Read(string name, System.Action<byte[]> done)
        {
            var path = Path.Combine(Application.streamingAssetsPath, "world", name);
            if (path.Contains("://") || path.StartsWith("jar:"))
            {
                using var req = UnityWebRequest.Get(path);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { Error = $"{name}: {req.error}"; yield break; }
                done(req.downloadHandler.data);
            }
            else
            {
                if (!File.Exists(path)) { Error = $"{name}: missing"; yield break; }
                done(File.ReadAllBytes(path));
            }
        }

        /// <summary>The chunks the focus wants loaded, nearest first.</summary>
        public List<(int cx, int cz)> WantedChunks() => WorldGrid.Around(Focus.x, Focus.z, LoadRadius);

        /// <summary>A place's centre at its pad's level, in world space (for cameras, spawns and tests).</summary>
        public Vector3 PlaceCentre(string id)
        {
            var p = Layout.Places[id];
            return new Vector3(p.Centre[0], Gen.Pad(p).level, p.Centre[1]);
        }
    }
}
