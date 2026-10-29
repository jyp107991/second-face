using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>A named point or area of a place the game uses (Core PlacePlan.Marker): a spawn, an exit, a trigger, a
    /// schedule spot, a talk or container prop, a person's post. Its transform is the point; an area's size is in
    /// <see cref="Size"/> (x across, y along z), centred on it.</summary>
    public sealed class PlaceMarker : MonoBehaviour
    {
        public string Kind;
        public string Id;
        /// <summary>What it refers to: an exit's destination, a person's definition.</summary>
        public string Ref;
        public Vector2 Size;
    }
}
