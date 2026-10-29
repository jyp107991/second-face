using System;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The terrain layers by texture-library key (every key a biome palette names in Core's TerrainPaint) and the terrain
    /// material. A chunk paints with the keys TerrainPaint picks for it and looks each one up here. Built by the editor
    /// from the texture library (Assets/SecondFace/Terrain/BiomeLayers.asset, committed with its layers so their GUIDs
    /// survive a fresh clone).
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/Biome layer set")]
    public sealed class BiomeLayerSet : ScriptableObject
    {
        [Serializable]
        public sealed class Entry
        {
            public string Key;
            public TerrainLayer Layer;
        }

        public Material TerrainMaterial;
        public Entry[] Layers = Array.Empty<Entry>();

        /// <summary>The layer for a library key, or null when the set has none.</summary>
        public TerrainLayer Layer(string key)
        {
            foreach (var e in Layers) if (e.Key == key) return e.Layer;
            return null;
        }
    }
}
