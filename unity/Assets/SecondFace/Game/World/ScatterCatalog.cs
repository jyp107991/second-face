using System;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// What the world's props are made of (step 19a): each model id Core's WorldScatter names, with the Addressables
    /// addresses of its variants (the bound prefabs: nature/&lt;variant&gt;, kits-trees/&lt;tree&gt;_&lt;seed&gt;). Built by the editor
    /// (ScatterCatalogBuilder) from the model manifests and committed; read from worker threads (it never changes at run).
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/Scatter catalog")]
    public sealed class ScatterCatalog : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string Id;
            public string[] Addresses = Array.Empty<string>();
        }

        public Entry[] Entries = Array.Empty<Entry>();

        private System.Collections.Generic.Dictionary<string, string[]> _byId;

        private System.Collections.Generic.Dictionary<string, string[]> ById()
        {
            var map = _byId;
            if (map != null) return map;
            map = new System.Collections.Generic.Dictionary<string, string[]>();
            foreach (var e in Entries) map[e.Id] = e.Addresses;
            return _byId = map;
        }

        /// <summary>How many variants a model has (0: none built).</summary>
        public int Variants(string id) => ById().TryGetValue(id, out var a) ? a.Length : 0;

        public string Address(string id, int variant) => ById().TryGetValue(id, out var a) && a.Length > 0 ? a[variant % a.Length] : null;
    }
}
