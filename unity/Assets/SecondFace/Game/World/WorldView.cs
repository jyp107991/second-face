using System;

namespace SecondFace.Game.World
{
    /// <summary>
    /// What the world shows (step 21b): while the player is under the ground (a shelter, its tunnel) the surface is not
    /// drawn — the streamed terrain with its roads and small scatter, the props, the place's own surface — so the iso
    /// camera, high above, sees the rooms below. <see cref="PlaceInteriors"/> sets it; the streamer and the camera follow
    /// <see cref="Changed"/>.
    /// </summary>
    public static class WorldView
    {
        public static bool Underground { get; private set; }
        public static event Action<bool> Changed;

        public static void SetUnderground(bool below)
        {
            if (below == Underground) return;
            Underground = below;
            Changed?.Invoke(below);
        }
    }
}
