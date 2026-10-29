using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>What the game needs to raise the world (step 23): the terrain's layers and road and water materials, the
    /// props' and small scatter's catalogues, the built places and the sky. The Boot scene's <see cref="Bootstrap"/> holds
    /// it, so the player build carries them (with the walkabout's people); the props, plants and places themselves load
    /// by address. Built by the editor
    /// (Second Face/Build world assets) at Assets/SecondFace/World/WorldAssets.asset.</summary>
    [CreateAssetMenu(menuName = "Second Face/World assets")]
    public sealed class WorldAssets : ScriptableObject
    {
        public BiomeLayerSet Layers;
        public ScatterCatalog Catalog;
        public DetailSet Details;
        public PlaceSet Places;
        public SkyProfile Sky;
        /// <summary>The walkabout's stand-in for the player (a P2 person) and the people standing about the town (step 25),
        /// with the locomotion controller they share (idle at rest, the captured walk and jog by speed).</summary>
        public GameObject Walker;
        public GameObject[] Townsfolk;
        /// <summary>The player's bodies (the player bases with their wardrobes, P4.2-P4.3): the pack's figure.</summary>
        public GameObject PlayerM, PlayerF;
        public RuntimeAnimatorController Locomotion;
        /// <summary>The cloth of the bundles things dropped on the ground lie in (P6.1; the library's burlap).</summary>
        public Material Sack;
        /// <summary>Every body of the cast (P4.1, P4.11) with who it can stand in for: a place's people each wear one of
        /// their sex and nearest age (P6.2, Core <c>Routine.Assign</c>).</summary>
        public CastEntry[] Cast;

        [System.Serializable]
        public sealed class CastEntry
        {
            public string Id;
            public GameObject Prefab;
            public bool Male;
            public float Age;
            public string Role;
        }

        public bool Complete => Layers != null && Catalog != null && Details != null && Places != null && Sky != null;
    }
}
