using System;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The terrain layers each biome paints with, in Core's role order (TerrainPaint: base, patches, accent, steep), and
    /// the terrain material. Built by the editor from the texture library (Assets/SecondFace/Terrain/BiomeLayers.asset,
    /// committed with its layers so their GUIDs survive a fresh clone).
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/Biome layer set")]
    public sealed class BiomeLayerSet : ScriptableObject
    {
        [Serializable]
        public sealed class Biome
        {
            public string Id;
            public TerrainLayer[] Layers = new TerrainLayer[4];
        }

        public Material TerrainMaterial;
        public Biome[] Biomes = Array.Empty<Biome>();

        public TerrainLayer[] LayersFor(string biome)
        {
            foreach (var b in Biomes) if (b.Id == biome) return b.Layers;
            return Biomes.Length > 0 ? Biomes[0].Layers : Array.Empty<TerrainLayer>();
        }
    }
}
