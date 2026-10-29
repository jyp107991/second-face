using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>The sky's assets (BUILD_PLAN §6.A.6): the procedural sky material and the weather particles' materials.
    /// Built by the editor (SkyAssets) into Assets/SecondFace/Sky and committed, like the terrain layers.</summary>
    [CreateAssetMenu(menuName = "Second Face/Sky profile")]
    public sealed class SkyProfile : ScriptableObject
    {
        public Material Sky;
        /// <summary>A soft vertical streak (rain).</summary>
        public Material Streak;
        /// <summary>A soft round dot (snow, motes, dust sheets).</summary>
        public Material Dot;
    }
}
