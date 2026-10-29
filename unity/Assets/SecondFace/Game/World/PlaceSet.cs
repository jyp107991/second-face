using System;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>The places built as prefabs (BUILD_PLAN §6.A.5): place id → Addressables address. Made by the editor's
    /// PlaceBuilder; a place not listed stands as its bare pad until its kit is built.</summary>
    [CreateAssetMenu(menuName = "Second Face/Place set")]
    public sealed class PlaceSet : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string Id;
            public string Address;
        }

        public Entry[] Entries = Array.Empty<Entry>();

        public string AddressOf(string id)
        {
            foreach (var e in Entries) if (e.Id == id) return e.Address;
            return null;
        }
    }
}
