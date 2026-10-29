using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>A building of a place (PlaceBuilder): its footprint in the place's space (x0, z0, x1, z1 on its walls'
    /// centrelines), the top of its floor and of its walls, and the roof that hides when someone is inside
    /// (<see cref="PlaceInteriors"/>).</summary>
    public sealed class PlaceBuilding : MonoBehaviour
    {
        public Vector4 Footprint;
        public float Floor, Height;
        /// <summary>The roof and everything kept on it (one child).</summary>
        public Transform Roof;
        /// <summary>Its doors and shutters (they would stand above walls cut away round the room).</summary>
        public Transform Fittings;

        /// <summary>The footprint as world bounds (the place is not rotated).</summary>
        public Bounds WorldBounds
        {
            get
            {
                var origin = transform.parent != null ? transform.parent.parent : transform;
                var o = origin != null ? origin.position : Vector3.zero;
                var min = new Vector3(Footprint.x, Floor - 0.5f, Footprint.y) + o;
                var max = new Vector3(Footprint.z, Height + 1.5f, Footprint.w) + o;
                var b = new Bounds(); b.SetMinMax(min, max);
                return b;
            }
        }
    }
}
