using System.Collections.Generic;
using System.Diagnostics;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace SecondFace.Game.World
{
    /// <summary>
    /// Puts the world's props into the scene (step 19a): a chunk's placements (Core <see cref="WorldScatter"/>, computed
    /// with the chunk on its worker) become instances of the bound prefabs, loaded by address through Addressables once
    /// each and kept. Instances are pooled per address and placed within a time budget a frame (activation, not
    /// creation, is what a write costs once the pool is warm), so a chunk's few hundred props arrive over a few frames
    /// and never stall one. Plain MeshRenderers: the GPU Resident Drawer batches them on the Vulkan tier; their meshes
    /// carry Mesh LODs (the nature import), the card trees their LODGroups.
    /// </summary>
    public sealed class ScatterSpawner : MonoBehaviour
    {
        public ScatterCatalog Catalog;
        /// <summary>Main-thread milliseconds a frame for placing props.</summary>
        public float BudgetMs = 1.5f;

        private readonly Dictionary<string, AsyncOperationHandle<GameObject>> _prefabs = new();
        private readonly Dictionary<string, Stack<GameObject>> _pool = new();
        private readonly Dictionary<(int cx, int cz), List<(string address, GameObject go)>> _live = new();
        private readonly Dictionary<(int cx, int cz), Queue<PropPlacement>> _queued = new();
        private readonly List<(int cx, int cz)> _order = new();
        private Transform _root;

        /// <summary>Props in the scene now, and placements waiting.</summary>
        public int LiveCount { get; private set; }
        public int QueuedCount { get { var n = 0; foreach (var q in _queued.Values) n += q.Count; return n; } }
        public bool Idle => QueuedCount == 0;
        public bool IsShown(int cx, int cz) => _live.ContainsKey((cx, cz)) || _queued.ContainsKey((cx, cz));

        private void Awake() => _root = new GameObject("Props").transform;

        /// <summary>Shows or hides every prop (the world view under the ground hides the surface).</summary>
        public void SetVisible(bool on) { if (_root != null) _root.gameObject.SetActive(on); }

        /// <summary>Queues a chunk's props (nothing happens if it is shown already).</summary>
        public void Show(int cx, int cz, IReadOnlyList<PropPlacement> props)
        {
            if (props == null || IsShown(cx, cz)) return;
            _live[(cx, cz)] = new List<(string, GameObject)>();
            _queued[(cx, cz)] = new Queue<PropPlacement>(props);
            _order.Add((cx, cz));
        }

        /// <summary>Returns a chunk's props to the pool and drops what was still waiting.</summary>
        public void Hide(int cx, int cz)
        {
            _queued.Remove((cx, cz));
            _order.Remove((cx, cz));
            if (!_live.TryGetValue((cx, cz), out var list)) return;
            foreach (var (address, go) in list)
            {
                go.SetActive(false);
                if (!_pool.TryGetValue(address, out var stack)) _pool[address] = stack = new Stack<GameObject>();
                stack.Push(go);
            }
            LiveCount -= list.Count;
            _live.Remove((cx, cz));
        }

        private void Update() => Work(BudgetMs);

        /// <summary>Places waiting props for up to <paramref name="budgetMs"/> (tests call it with a large budget).</summary>
        public void Work(float budgetMs)
        {
            if (Catalog == null || _order.Count == 0) return;
            var sw = Stopwatch.StartNew();
            for (var k = 0; k < _order.Count && sw.Elapsed.TotalMilliseconds < budgetMs; k++)
            {
                var chunk = _order[k];
                var queue = _queued[chunk];
                var (x0, z0) = WorldGrid.Origin(chunk.cx, chunk.cz);
                var waiting = 0;
                while (queue.Count > waiting && sw.Elapsed.TotalMilliseconds < budgetMs)
                {
                    var p = queue.Dequeue();
                    var address = Catalog.Address(p.Model, p.Variant);
                    if (address == null) continue;
                    var (ready, prefab) = Prefab(address);
                    if (!ready) { queue.Enqueue(p); waiting++; continue; }   // still loading: try it again later
                    if (prefab == null) continue;                           // failed to load (warned once): skipped
                    GameObject go;
                    if (_pool.TryGetValue(address, out var stack) && stack.Count > 0) go = stack.Pop();
                    else go = Instantiate(prefab, _root);
                    go.transform.SetPositionAndRotation(new Vector3(x0 + p.X, p.Y - 0.05f, z0 + p.Z), Quaternion.Euler(0, p.Yaw, 0));
                    go.transform.localScale = Vector3.one * p.Scale;
                    if (!go.activeSelf) go.SetActive(true);
                    _live[chunk].Add((address, go));
                    LiveCount++;
                }
                if (queue.Count == 0) { _queued.Remove(chunk); _order.RemoveAt(k); k--; }
            }
        }

        private readonly HashSet<string> _failed = new();

        /// <summary>Whether the prefab at an address is settled, and the prefab (null if it failed to load); starts the
        /// load the first time it is asked for.</summary>
        private (bool ready, GameObject prefab) Prefab(string address)
        {
            if (!_prefabs.TryGetValue(address, out var handle))
            {
                handle = Addressables.LoadAssetAsync<GameObject>(address);
                _prefabs[address] = handle;
            }
            if (!handle.IsDone) return (false, null);
            if (handle.Status != AsyncOperationStatus.Succeeded)
            {
                if (_failed.Add(address)) UnityEngine.Debug.LogWarning($"ScatterSpawner: {address} did not load");
                return (true, null);
            }
            return (true, handle.Result);
        }

        private void OnDestroy()
        {
            foreach (var h in _prefabs.Values) if (h.IsValid()) Addressables.Release(h);
            _prefabs.Clear();
            if (_root != null) Destroy(_root.gameObject);
        }
    }
}
