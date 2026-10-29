using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace SecondFace.Game.World
{
    /// <summary>
    /// Puts the built places in the world round the focus (BUILD_PLAN §6.A.4–A.5): a place whose footprint comes within
    /// <see cref="ShowWithin"/> m of the focus is instantiated by address at its centre on its pad's level, and released
    /// beyond <see cref="DropBeyond"/> (the band between stops flicker at the edge). One instantiation in flight at a time.
    /// </summary>
    public sealed class PlaceSpawner : MonoBehaviour
    {
        public WorldService World;
        public PlaceSet Places;
        /// <summary>Cuts the terrain over a place's tunnel mouths (<see cref="PlaceHole"/>) while it stands.</summary>
        public WorldStreamer Streamer;
        public float ShowWithin = 600f, DropBeyond = 800f;

        private readonly Dictionary<string, AsyncOperationHandle<GameObject>> _live = new();
        private AsyncOperationHandle<GameObject>? _pending;
        private Transform _root;

        /// <summary>No instantiation in flight.</summary>
        public bool Idle => _pending == null;
        public bool IsShown(string id) => _live.TryGetValue(id, out var h) && h.IsDone && h.Status == AsyncOperationStatus.Succeeded;
        public GameObject Instance(string id) => IsShown(id) ? _live[id].Result : null;
        public int LiveCount => _live.Count;

        private void Update()
        {
            if (World == null || !World.Ready || Places == null) return;
            if (_pending is { } p)
            {
                if (!p.IsDone) return;
                if (p.Status != AsyncOperationStatus.Succeeded) Debug.LogWarning($"PlaceSpawner: {p.OperationException?.Message}");
                else Ready(p.Result);
                _pending = null;
            }
            var focus = World.Focus;
            foreach (var e in Places.Entries)
            {
                if (!World.Layout.Places.TryGetValue(e.Id, out var info)) continue;
                var d = Distance(info, focus);
                if (d <= ShowWithin && !_live.ContainsKey(e.Id))
                {
                    var at = new Vector3(info.Centre[0], World.Gen.Pad(info).level, info.Centre[1]);
                    if (_root == null) _root = new GameObject("Places").transform;
                    var h = Addressables.InstantiateAsync(e.Address, at, Quaternion.identity, _root);
                    _live[e.Id] = h;
                    _pending = h;
                    return;
                }
                if (d > DropBeyond && _live.TryGetValue(e.Id, out var live))
                {
                    if (live.IsValid()) Addressables.ReleaseInstance(live);
                    _live.Remove(e.Id);
                    if (Streamer != null) Streamer.SetHoles(e.Id, null);
                }
            }
        }

        /// <summary>A place just put in: it learns the world's focus (to open its buildings) and cuts its holes.</summary>
        private void Ready(GameObject place)
        {
            if (place.TryGetComponent<PlaceInteriors>(out var interiors)) interiors.World = World;
            if (Streamer == null) return;
            var holes = new List<Rect>();
            var o = place.transform.position;
            foreach (var h in place.GetComponentsInChildren<PlaceHole>(true))
                holes.Add(new Rect(h.Area.x + o.x, h.Area.y + o.z, h.Area.width, h.Area.height));
            if (holes.Count > 0) Streamer.SetHoles(place.name.Replace("(Clone)", ""), holes);
        }

        /// <summary>From the focus to the nearest point of the place's footprint, metres (0 inside).</summary>
        private static float Distance(SecondFace.Core.World.PlaceInfo p, Vector3 focus)
        {
            float dx = Mathf.Max(0, Mathf.Abs(focus.x - p.Centre[0]) - p.Size[0] / 2), dz = Mathf.Max(0, Mathf.Abs(focus.z - p.Centre[1]) - p.Size[1] / 2);
            return Mathf.Sqrt(dx * dx + dz * dz);
        }

        private void OnDestroy()
        {
            foreach (var h in _live.Values) if (h.IsValid()) Addressables.ReleaseInstance(h);
            _live.Clear();
        }
    }
}
