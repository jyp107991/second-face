using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>Where a place opens the ground (a tunnel's mouth): a rectangle in the place's space (x, z) the streamed
    /// terrain is cut away over while the place stands (<see cref="WorldStreamer.SetHoles"/>), so the way down is not
    /// covered by the ground it goes under.</summary>
    public sealed class PlaceHole : MonoBehaviour
    {
        public Rect Area;
    }
}
