using System.Collections;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The walkabout (step 25, the `play-walkabout` build): on the raised <see cref="WorldStage"/>, a stand-in for the
    /// player set down at Shale's spawn, the game camera on them, touch to look round, tap to walk, pinch to zoom, the
    /// NavMesh following them over the open ground and through the town, and the P2 people standing about the town at
    /// its people's posts, idling. The world streams round the walker. <see cref="Pause"/> hands the camera to the
    /// measuring tour and back.
    /// </summary>
    public sealed class Walkabout : MonoBehaviour
    {
        public WorldStage Stage;
        public float LoadTimeout = 180f;

        public Walker Walker { get; private set; }
        public OrbitRig Rig { get; private set; }
        public WorldNav Nav { get; private set; }
        public TouchInput Input { get; private set; }
        public bool Paused { get; private set; }
        /// <summary>The walker stands on a built NavMesh and the camera follows them.</summary>
        public bool Ready => Walker != null && Nav != null && Nav.Ready && Walker.Agent.isOnNavMesh;
        public int Townsfolk { get; private set; }

        private IEnumerator Start()
        {
            if (Stage == null) yield break;
            if (!Stage.Raised) yield return Stage.Raise();
            if (!Stage.Raised) yield break;
            var assets = Stage.Assets;
            if (assets.Walker == null || assets.Locomotion == null) { Debug.LogWarning("Walkabout: no walker in the world assets (Second Face/Build world assets)"); yield break; }
            var centre = Stage.World.PlaceCentre("shale");
            yield return Stage.WaitAround(centre, "shale", LoadTimeout);
            var spawn = Stage.Marker("shale", "spawn");
            var at = spawn != null ? spawn.transform.position : centre;
            var yaw = spawn != null ? spawn.transform.eulerAngles.y : 0f;
            Walker = Walker.Create(assets.Walker, assets.Locomotion, at, yaw);
            Nav = gameObject.AddComponent<WorldNav>();
            Nav.Target = Walker.transform;
            Rig = OrbitRig.Create(Stage.Camera, Walker.transform);
            Rig.Yaw = yaw + 20f;
            Rig.Snap();
            Input = gameObject.AddComponent<TouchInput>();
            Input.Rig = Rig; Input.Walker = Walker; Input.Camera = Stage.Camera;
            Townsfolk = Populate(assets);
        }

        /// <summary>The P2 people at the town's people's posts (one each, the first posts), idling out of step.</summary>
        private int Populate(WorldAssets assets)
        {
            if (assets.Townsfolk == null || assets.Townsfolk.Length == 0) return 0;
            var place = Stage.Streamer.PlaceSpawner?.Instance("shale");
            if (place == null) return 0;
            var n = 0;
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "npc" || n >= assets.Townsfolk.Length) continue;
                var model = assets.Townsfolk[n];
                if (model == null) continue;
                var p = Instantiate(model, m.transform.position, Quaternion.Euler(0, Hash(m.Id) * 360f, 0), place.transform);
                p.name = "townsfolk_" + model.name;
                var anim = p.GetComponentInChildren<Animator>();
                if (anim != null)
                {
                    anim.runtimeAnimatorController = assets.Locomotion;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.CullCompletely;
                    anim.Play(0, 0, Hash(m.Id + "t"));
                }
                n++;
            }
            return n;
        }

        private static float Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) h = (h ^ c) * 16777619u;
                return (h & 0xFFFF) / 65536f;
            }
        }

        private void Update()
        {
            if (!Paused && Walker != null) Stage.World.Focus = Walker.transform.position;
        }

        /// <summary>Hands the camera to someone else (the measuring tour) or takes it back.</summary>
        public void Pause(bool paused)
        {
            Paused = paused;
            if (Input != null) Input.enabled = !paused;
            if (Stage.Camera.TryGetComponent<Unity.Cinemachine.CinemachineBrain>(out var brain)) brain.enabled = !paused;
            if (!paused && Rig != null) Rig.Snap();
        }

        /// <summary>The world line for the overlay.</summary>
        public string Line()
        {
            var nav = Nav == null ? "no mesh" : Nav.Ready ? $"mesh ×{Nav.Builds}" : "mesh building";
            return Stage.Line() + $" · walker {(Walker == null ? "-" : Walker.Agent.isOnNavMesh ? "on" : "off")} the {nav} · {Townsfolk} people";
        }
    }
}
