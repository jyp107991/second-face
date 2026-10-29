using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>What the game needs to raise the world (step 23): the terrain's layers and road and water materials, the
    /// props' and small scatter's catalogues, the built places and the sky. The Boot scene's <see cref="Bootstrap"/> holds
    /// it, so the player build carries them; the props, plants and places themselves load by address. Built by the editor
    /// (Second Face/Build world assets) at Assets/SecondFace/World/WorldAssets.asset.</summary>
    [CreateAssetMenu(menuName = "Second Face/World assets")]
    public sealed class WorldAssets : ScriptableObject
    {
        public BiomeLayerSet Layers;
        public ScatterCatalog Catalog;
        public DetailSet Details;
        public PlaceSet Places;
        public SkyProfile Sky;

        public bool Complete => Layers != null && Catalog != null && Details != null && Places != null && Sky != null;
    }
}
