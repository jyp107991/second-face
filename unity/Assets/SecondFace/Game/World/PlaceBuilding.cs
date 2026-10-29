using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>A building of a place (PlaceBuilder): its footprint about its own position (x0, z0, x1, z1 on its walls'
    /// centrelines), the top of its floor and of its walls over it, and the roof that hides when someone is inside
    /// (<see cref="PlaceInteriors"/>). An underground one (a shelter, its tunnel) hides the surface while it is open.</summary>
    public sealed class PlaceBuilding : MonoBehaviour
    {
        public Vector4 Footprint;
        public float Floor, Height;
        /// <summary>The roof and everything kept on it (one child).</summary>
        public Transform Roof;
        /// <summary>Its doors and shutters (they would stand above walls cut away round the room).</summary>
        public Transform Fittings;
        public bool Underground;

        /// <summary>The footprint as world bounds (places are not rotated).</summary>
        public Bounds WorldBounds
        {
            get
            {
                var o = transform.position;
                var min = new Vector3(Footprint.x, Floor - 0.5f, Footprint.y) + o;
                var max = new Vector3(Footprint.z, Height + 1.5f, Footprint.w) + o;
                var b = new Bounds(); b.SetMinMax(min, max);
                return b;
            }
        }
    }
}
