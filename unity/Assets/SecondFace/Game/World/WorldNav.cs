using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The NavMesh round the one who walks (step 25): one mesh over the streamed terrain, the props and the places (the world's own
    /// static geometry alone, <see cref="PlaceNav.WorldSources"/>) within <see cref="Size"/> m of <see cref="Target"/>, built on worker threads and rebuilt round them when they come
    /// within <see cref="Margin"/> m of its edge (the old mesh serves until the new one is in). While it runs, places build
    /// none of their own (<see cref="PlaceNav.Disabled"/>), and those built before it came are dropped: two meshes over the
    /// same ground do not join (a path from one ends short at the other's edge). Voxels of
    /// <see cref="Voxel"/> m (three to a person's width: a 1.1 m door stays open) keep a phone's build short.
    /// </summary>
    public sealed class WorldNav : MonoBehaviour, WorldOrigin.IRebase, WorldOrigin.INavRebase
    {
        /// <summary>The floating origin's rebase (§19.1): the built and pending areas move with the world at once.</summary>
        public void OnRebase(Vector3 d) { Area = new Bounds(Area.center + d, Area.size); _pending.center += d; }
        /// <summary>The rebase's second frame: the data re-added at its new place at once (the agents are warped onto it next); a build
        /// in flight was asked for the old frame's area, so the area is built again once it is done.</summary>
        public void OnNavRebase(Vector3 d)
        {
            Move(d);
            if (_build != null && !_build.isDone) _rebuildAfter = true;
        }
        private bool _rebuildAfter;
        private void Move(Vector3 d)
        {
            if (_data == null || d == Vector3.zero) return;
            if (_instance.valid) _instance.Remove();
            _data.position += d;
            _instance = NavMesh.AddNavMeshData(_data);
        }
        public Transform Target;
        /// <summary>The streamer whose ground and places the mesh is built on: when ground comes in or a place is set down
        /// (its pad flattened into the terrain) after a build, the mesh is built again round the same middle, or the walker
        /// meets ground the mesh never saw until they near its edge (the new places' tests: a mesh built before a pad was
        /// stamped lay on the old ground, posts inside buildings cut off, 2026-11-16).</summary>
        public WorldStreamer Streamer;
        private int _seen = -1;
        private float _lastBuild;
        public float Size = 160f, Height = 120f, Margin = 40f, Voxel = 0.15f;

        public bool Ready { get; private set; }
        public int Builds { get; private set; }
        public Bounds Area { get; private set; }

        private NavMeshData _data;
        private NavMeshDataInstance _instance;
        private AsyncOperation _build;
        private Bounds _pending;

        private void OnEnable()
        {
            PlaceNav.Disabled = true;
            PlaceNav.DropAll();
        }

        private void OnDisable()
        {
            PlaceNav.Disabled = false;
            if (_instance.valid) _instance.Remove();
        }

        private void Update()
        {
            if (Target == null) return;
            if (_build != null)
            {
                if (!_build.isDone) return;
                _build = null; Area = _pending; Ready = true; Builds++;
                if (_rebuildAfter && Target != null) { _rebuildAfter = false; Rebuild(Target.position); return; }
            }
            var p = Target.position;
            var inner = Size / 2 - Margin;
            if (Builds > 0 && Mathf.Abs(p.x - Area.center.x) < inner && Mathf.Abs(p.z - Area.center.z) < inner)
            {
                // (at most every two seconds: a place's pieces come in over a few frames)
                if (Streamer == null || Seen() == _seen || Time.unscaledTime - _lastBuild < 2f) return;
                Rebuild(Area.center);
                return;
            }
            Rebuild(p);
        }

        /// <summary>What the streamer has standing: its built chunks and its places set down.</summary>
        private int Seen() => Streamer == null ? -1 : Streamer.Built.Count * 1000 + (Streamer.PlaceSpawner != null ? Streamer.PlaceSpawner.LiveCount : 0);

        /// <summary>Builds round a point now (also when the walker is set down somewhere new).</summary>
        public void Rebuild(Vector3 centre)
        {
            var settings = PlaceNav.Settings();
            settings.overrideVoxelSize = true;
            settings.voxelSize = Voxel;
            if (_data == null)
            {
                _data = new NavMeshData(settings.agentTypeID);
                _instance = NavMesh.AddNavMeshData(_data);
            }
            _pending = new Bounds(new Vector3(centre.x, centre.y, centre.z), new Vector3(Size, Height, Size));
            _seen = Seen(); _lastBuild = Time.unscaledTime;
            // (the bounds in the data's own space, as NavMeshSurface gives them; the sources stay in the world's: once a rebase has moved
            // the data, world bounds built the walker's surroundings that far off, MRC §19.3)
            var local = new Bounds(_pending.center - _data.position, _pending.size);
            _build = NavMeshBuilder.UpdateNavMeshDataAsync(_data, settings, PlaceNav.Collect(_pending), local);
        }
    }
}
