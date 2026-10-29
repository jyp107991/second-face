using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The terrain's detail prototypes (steps 19b–c), in Core <see cref="SecondFace.Core.World.WorldDetails.Keys"/>
    /// order, all instanced meshes: bushes, stones, branches and ferns (a scan cut to a light Mesh LOD, with its library
    /// materials) and grass tufts (a star of tilted cards: the terrain's own grass cards stand upright and read as
    /// slivers from the iso camera). Made by the editor (DetailMeshes) and loaded by address. Every chunk terrain carries the same prototypes; a chunk writes only
    /// the layers its biomes use.
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/Detail set")]
    public sealed class DetailSet : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string Key;
            public string Address;
            public float MinScale = 1f, MaxScale = 1f;
            [Range(0, 1)] public float AlignToGround = 0.6f;
        }

        public Entry[] Entries = Array.Empty<Entry>();

        /// <summary>The prototypes once loaded (null before <see cref="Load"/> finishes).</summary>
        public DetailPrototype[] Prototypes { get; private set; }

        private readonly List<AsyncOperationHandle<GameObject>> _handles = new();

        /// <summary>Loads every prototype's prefab by address and builds the terrain's prototypes.</summary>
        public IEnumerator Load()
        {
            if (Prototypes != null) yield break;
            var protos = new DetailPrototype[Entries.Length];
            for (var i = 0; i < Entries.Length; i++)
            {
                var e = Entries[i];
                var h = Addressables.LoadAssetAsync<GameObject>(e.Address);
                _handles.Add(h);
                yield return h;
                if (h.Status != AsyncOperationStatus.Succeeded) { Debug.LogWarning($"DetailSet: {e.Address} did not load"); continue; }
                protos[i] = new DetailPrototype
                {
                    prototype = h.Result,
                    usePrototypeMesh = true,
                    useInstancing = true,
                    renderMode = DetailRenderMode.VertexLit,
                    minWidth = e.MinScale, maxWidth = e.MaxScale,
                    minHeight = e.MinScale, maxHeight = e.MaxScale,
                    alignToGround = e.AlignToGround,
                    positionJitter = 1f,
                    noiseSpread = 0.3f,
                    healthyColor = Color.white, dryColor = Color.white,
                };
            }
            // a prototype that failed to load is replaced by the first that did: the layer indices must stay in Core's order
            DetailPrototype first = null;
            foreach (var p in protos) if (p != null) { first = p; break; }
            for (var i = 0; i < protos.Length; i++) protos[i] ??= first;
            Prototypes = first != null ? protos : Array.Empty<DetailPrototype>();
        }

        private void OnDisable()
        {
            foreach (var h in _handles) if (h.IsValid()) Addressables.Release(h);
            _handles.Clear();
            Prototypes = null;
        }
    }
}
