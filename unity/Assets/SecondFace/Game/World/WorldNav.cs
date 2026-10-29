using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The NavMesh round the one who walks (step 25): one mesh over the streamed terrain, the props and the places
    /// within <see cref="Size"/> m of <see cref="Target"/>, built on worker threads and rebuilt round them when they come
    /// within <see cref="Margin"/> m of its edge (the old mesh serves until the new one is in). While it runs, places build
    /// none of their own (<see cref="PlaceNav.Disabled"/>), and those built before it came are dropped: two meshes over the
    /// same ground do not join (a path from one ends short at the other's edge). Voxels of
    /// <see cref="Voxel"/> m (three to a person's width: a 1.1 m door stays open) keep a phone's build short.
    /// </summary>
    public sealed class WorldNav : MonoBehaviour
    {
        public Transform Target;
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
            }
            var p = Target.position;
            var inner = Size / 2 - Margin;
            if (Builds > 0 && Mathf.Abs(p.x - Area.center.x) < inner && Mathf.Abs(p.z - Area.center.z) < inner) return;
            Rebuild(p);
        }

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
            _build = NavMeshBuilder.UpdateNavMeshDataAsync(_data, settings, PlaceNav.Collect(_pending), _pending);
        }
    }
}
