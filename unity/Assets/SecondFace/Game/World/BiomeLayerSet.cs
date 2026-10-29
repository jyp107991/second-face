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

        [Serializable]
        public sealed class SurfaceEntry
        {
            public string Key;
            public Material Material;
        }

        public Material TerrainMaterial;
        public Entry[] Layers = Array.Empty<Entry>();
        /// <summary>The road surfaces' materials by Core RoadStrips' surface key (asphalt, gravel, mud, trail).</summary>
        public SurfaceEntry[] Surfaces = Array.Empty<SurfaceEntry>();
        /// <summary>The sea's and the rivers' sheet (SecondFace/Water, step 22).</summary>
        public Material Water;

        /// <summary>The material for a road surface, or null.</summary>
        public Material Surface(string key)
        {
            foreach (var e in Surfaces) if (e.Key == key) return e.Material;
            return null;
        }

        /// <summary>The layer for a library key, or null when the set has none.</summary>
        public TerrainLayer Layer(string key)
        {
            foreach (var e in Layers) if (e.Key == key) return e.Layer;
            return null;
        }
    }
}
